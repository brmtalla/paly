import { useStudyStore } from '../stores/studyStore';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';

jest.mock('../lib/supabase', () => {
  const chain: Record<string, jest.Mock> = {};
  ['select', 'insert', 'update', 'eq', 'gte', 'lt', 'not', 'order', 'limit', 'in'].forEach((m) => {
    chain[m] = jest.fn(() => chain);
  });
  chain.single = jest.fn().mockResolvedValue({ data: null, error: null });
  chain.then = undefined as never;

  return {
    supabase: {
      from: jest.fn(() => chain),
      rpc: jest.fn(),
      functions: { invoke: jest.fn() },
      auth: { getSession: jest.fn() },
    },
  };
});

const mockedRpc = supabase.rpc as unknown as jest.Mock;
const mockedInvoke = supabase.functions.invoke as unknown as jest.Mock;

const baseProfile = {
  id: 'user-1',
  paly_points: 0,
  reading_streak: 0,
} as Profile;

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ profile: { ...baseProfile } });
  useStudyStore.setState({ currentQuiz: null, synthesizedContent: [] });
});

describe('awardPoints', () => {
  it('sends only the reason and reference — never a point value', async () => {
    mockedRpc.mockResolvedValue({ data: { awarded: true, points: 5, total: 5 }, error: null });

    await useStudyStore.getState().awardPoints('flashcard_flip', 'content-1:3');

    expect(mockedRpc).toHaveBeenCalledWith('award_paly_points', {
      p_reason: 'flashcard_flip',
      p_ref_id: 'content-1:3',
    });

    // The client must not be able to influence the payout.
    const [, args] = mockedRpc.mock.calls[0];
    expect(JSON.stringify(args)).not.toMatch(/points/i);
  });

  it('reflects the server-reported total on the cached profile', async () => {
    mockedRpc.mockResolvedValue({ data: { awarded: true, points: 10, total: 125 }, error: null });

    const result = await useStudyStore.getState().awardPoints('quiz_pass', 'attempt-1');

    expect(result).toEqual({ awarded: true, points: 10, total: 125 });
    expect(useAuthStore.getState().profile?.paly_points).toBe(125);
  });

  it('does not credit anything when the server declines a duplicate claim', async () => {
    mockedRpc.mockResolvedValue({ data: { awarded: false, points: 0, total: 40 }, error: null });

    const result = await useStudyStore.getState().awardPoints('flashcard_flip', 'content-1:3');

    expect(result?.awarded).toBe(false);
    expect(result?.points).toBe(0);
    expect(useAuthStore.getState().profile?.paly_points).toBe(40);
  });

  it('asks for the free month only once the server total crosses the threshold', async () => {
    mockedRpc.mockResolvedValue({ data: { awarded: true, points: 10, total: 499 }, error: null });
    await useStudyStore.getState().awardPoints('quiz_pass', 'attempt-1');
    expect(mockedInvoke).not.toHaveBeenCalled();

    mockedInvoke.mockResolvedValue({ data: { success: true }, error: null });
    mockedRpc.mockResolvedValue({ data: { awarded: true, points: 10, total: 500 }, error: null });
    await useStudyStore.getState().awardPoints('quiz_pass', 'attempt-2');

    expect(mockedInvoke).toHaveBeenCalledWith('grant-free-month');
  });

  it('returns null and leaves points untouched when the server rejects the claim', async () => {
    useAuthStore.setState({ profile: { ...baseProfile, paly_points: 70 } as Profile });
    mockedRpc.mockResolvedValue({
      data: null,
      error: { message: 'No passing completed quiz attempt found for the current user' },
    });

    const result = await useStudyStore.getState().awardPoints('quiz_pass', 'attempt-forged');

    expect(result).toBeNull();
    expect(useAuthStore.getState().profile?.paly_points).toBe(70);
  });
});

describe('recordChunkRead', () => {
  it('delegates the streak calculation to the server', async () => {
    mockedRpc.mockResolvedValue({
      data: { reading_streak: 4, awarded: true, points: 25, total: 225 },
      error: null,
    });

    const result = await useStudyStore.getState().recordChunkRead('prompt-1');

    expect(mockedRpc).toHaveBeenCalledWith('record_chunk_read', { p_prompt_id: 'prompt-1' });
    expect(result?.reading_streak).toBe(4);

    const profile = useAuthStore.getState().profile;
    expect(profile?.reading_streak).toBe(4);
    expect(profile?.paly_points).toBe(225);
  });

  it('swallows a rejected prompt without touching the streak', async () => {
    useAuthStore.setState({
      profile: { ...baseProfile, reading_streak: 9, paly_points: 300 } as Profile,
    });
    mockedRpc.mockResolvedValue({
      data: null,
      error: { message: 'Study prompt not found for the current user' },
    });

    expect(await useStudyStore.getState().recordChunkRead('someone-elses-prompt')).toBeNull();
    expect(useAuthStore.getState().profile?.reading_streak).toBe(9);
    expect(useAuthStore.getState().profile?.paly_points).toBe(300);
  });
});

describe('requestNextChunk', () => {
  it('never sends a user id — the server derives it from the JWT', async () => {
    mockedInvoke.mockResolvedValue({ data: { success: true }, error: null });

    await useStudyStore.getState().requestNextChunk('class-1', false);

    expect(mockedInvoke).toHaveBeenCalledWith('request-chunk', {
      body: { classId: 'class-1', spendPoints: false },
    });
  });

  it('surfaces the structured body of a non-2xx response', async () => {
    const body = { error: 'weekly_limit_reached', pointsCost: 25, currentPoints: 10 };
    mockedInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Edge function returned 429', context: { json: async () => body } },
    });

    expect(await useStudyStore.getState().requestNextChunk('class-1')).toEqual(body);
  });
});

describe('completeQuiz — privilege gate', () => {
  // The mocked client returns the same chain for every table, so we assert on
  // whether the block-clearing update payload was ever issued.
  const chain = supabase.from('quiz_attempts') as unknown as { update: jest.Mock };

  const attempt = (correct: number, answered: number) => ({
    id: 'attempt-1',
    user_id: 'user-1',
    class_id: 'class-1',
    synthesized_content_id: 'sc-1',
    questions_answered: answered,
    correct_answers: correct,
    started_at: new Date().toISOString(),
    completed_at: null,
  });

  it('clears the overdue block when the quiz is passed (>=80%)', async () => {
    useStudyStore.setState({
      currentQuiz: { attempt: attempt(5, 5), questions: [], currentIndex: 0 },
    });

    const result = await useStudyStore.getState().completeQuiz();

    expect(result).toBe('attempt-1');
    expect(chain.update).toHaveBeenCalledWith({ quiz_deadline_notified: 0 });
  });

  it('leaves the block in place when the quiz is failed (<80%)', async () => {
    useStudyStore.setState({
      currentQuiz: { attempt: attempt(2, 5), questions: [], currentIndex: 0 },
    });

    const result = await useStudyStore.getState().completeQuiz();

    // The attempt is still recorded, but the block is not cleared.
    expect(result).toBe('attempt-1');
    expect(chain.update).not.toHaveBeenCalledWith({ quiz_deadline_notified: 0 });
  });
});
