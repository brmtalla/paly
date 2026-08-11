import { useStudyStore } from '../stores/studyStore';

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}));

describe('studyStore', () => {
  beforeEach(() => {
    useStudyStore.setState({
      synthesizedContent: [],
      studyPrompts: [],
      todaysPrompts: [],
      currentQuiz: null,
      isLoading: false,
      isSynthesizing: false,
      error: null,
    });
  });

  describe('getFlashcardsForClass', () => {
    it('returns flashcards from all synthesized content for a class', () => {
      useStudyStore.setState({
        synthesizedContent: [
          {
            id: 'sc1',
            class_id: 'c1',
            user_id: 'u1',
            session_date: '2026-01-01',
            summary: 'Test',
            key_takeaways: [],
            flashcards: [
              { front: 'Q1', back: 'A1' },
              { front: 'Q2', back: 'A2' },
            ],
            quiz_questions: [],
            daily_chunks: [],
            source_note_ids: [],
            source_upload_ids: [],
            next_class_date: null,
            quiz_deadline_notified: 0,
            created_at: '',
            updated_at: '',
          },
          {
            id: 'sc2',
            class_id: 'c1',
            user_id: 'u1',
            session_date: '2026-01-08',
            summary: 'Test 2',
            key_takeaways: [],
            flashcards: [{ front: 'Q3', back: 'A3' }],
            quiz_questions: [],
            daily_chunks: [],
            source_note_ids: [],
            source_upload_ids: [],
            next_class_date: null,
            quiz_deadline_notified: 0,
            created_at: '',
            updated_at: '',
          },
        ],
      });

      const flashcards = useStudyStore.getState().getFlashcardsForClass('c1');
      expect(flashcards).toHaveLength(3);
    });

    it('returns empty array for a class with no content', () => {
      expect(useStudyStore.getState().getFlashcardsForClass('nonexistent')).toHaveLength(0);
    });
  });

  describe('answerQuestion', () => {
    it('increments questions answered and correct count', () => {
      useStudyStore.setState({
        currentQuiz: {
          attempt: {
            id: 'qa1',
            user_id: 'u1',
            class_id: 'c1',
            synthesized_content_id: 'sc1',
            questions_answered: 0,
            correct_answers: 0,
            started_at: new Date().toISOString(),
            completed_at: null,
          },
          questions: [
            { id: '1', question: 'Test?', options: ['A', 'B'], correct_index: 0 },
            { id: '2', question: 'Test2?', options: ['A', 'B'], correct_index: 1 },
          ],
          currentIndex: 0,
        },
      });

      useStudyStore.getState().answerQuestion(true);
      const state = useStudyStore.getState();
      expect(state.currentQuiz?.attempt?.questions_answered).toBe(1);
      expect(state.currentQuiz?.attempt?.correct_answers).toBe(1);
      expect(state.currentQuiz?.currentIndex).toBe(1);
    });

    it('increments only questions answered for wrong answers', () => {
      useStudyStore.setState({
        currentQuiz: {
          attempt: {
            id: 'qa1',
            user_id: 'u1',
            class_id: 'c1',
            synthesized_content_id: 'sc1',
            questions_answered: 1,
            correct_answers: 1,
            started_at: new Date().toISOString(),
            completed_at: null,
          },
          questions: [
            { id: '1', question: 'Test?', options: ['A', 'B'], correct_index: 0 },
            { id: '2', question: 'Test2?', options: ['A', 'B'], correct_index: 1 },
          ],
          currentIndex: 1,
        },
      });

      useStudyStore.getState().answerQuestion(false);
      const state = useStudyStore.getState();
      expect(state.currentQuiz?.attempt?.questions_answered).toBe(2);
      expect(state.currentQuiz?.attempt?.correct_answers).toBe(1);
    });
  });

  describe('getAllOverdueQuizzes', () => {
    it('returns content with overdue quiz deadlines', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      useStudyStore.setState({
        synthesizedContent: [
          {
            id: 'sc1',
            class_id: 'c1',
            user_id: 'u1',
            session_date: '2026-01-01',
            summary: '',
            key_takeaways: [],
            flashcards: [],
            quiz_questions: [],
            daily_chunks: [],
            source_note_ids: [],
            source_upload_ids: [],
            next_class_date: yesterdayStr,
            quiz_deadline_notified: 1,
            created_at: '',
            updated_at: '',
          },
          {
            id: 'sc2',
            class_id: 'c2',
            user_id: 'u1',
            session_date: '2026-01-01',
            summary: '',
            key_takeaways: [],
            flashcards: [],
            quiz_questions: [],
            daily_chunks: [],
            source_note_ids: [],
            source_upload_ids: [],
            next_class_date: null,
            quiz_deadline_notified: 0,
            created_at: '',
            updated_at: '',
          },
        ],
      });

      const overdue = useStudyStore.getState().getAllOverdueQuizzes();
      expect(overdue).toHaveLength(1);
      expect(overdue[0].id).toBe('sc1');
    });
  });
});
