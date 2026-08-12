import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { PALY_POINTS_FREE_MONTH_THRESHOLD, QUIZ_PASS_THRESHOLD } from '../lib/constants';
import { useAuthStore } from './authStore';
import {
  SynthesizedContent,
  StudyPrompt,
  QuizAttempt,
  Flashcard,
  QuizQuestion,
  Profile,
  AwardPointsResult,
  RecordChunkReadResult,
} from '../types/database';

/** Keeps the cached profile in the auth store in step with server-side totals. */
function patchProfile(patch: Partial<Profile>) {
  const { profile, setProfile } = useAuthStore.getState();
  if (profile) setProfile({ ...profile, ...patch });
}

/**
 * Reasons a client may claim points for. The point value for each lives on the
 * server (see the award_paly_points migration) — the client only reports what
 * happened, never how much it is worth. 'reading_streak' is deliberately absent:
 * it is awarded only by record_chunk_read.
 */
export type PointsReason = 'flashcard_flip' | 'quiz_pass';

export type PointsResult = AwardPointsResult;
export type ChunkReadResult = RecordChunkReadResult;

interface StudyState {
  synthesizedContent: SynthesizedContent[];
  studyPrompts: StudyPrompt[];
  todaysPrompts: StudyPrompt[];
  currentQuiz: {
    attempt: QuizAttempt | null;
    questions: QuizQuestion[];
    currentIndex: number;
  } | null;
  isLoading: boolean;
  isSynthesizing: boolean;
  error: string | null;

  // Actions
  fetchSynthesizedContent: (userId: string, classId?: string) => Promise<void>;
  fetchStudyPrompts: (userId: string) => Promise<void>;
  fetchTodaysPrompts: (userId: string) => Promise<void>;
  markPromptAsRead: (promptId: string) => Promise<void>;
  synthesizeContent: (
    classId: string,
    userId: string,
    sessionDate: string
  ) => Promise<SynthesizedContent>;

  // Quiz actions
  startQuiz: (classId: string, userId: string, synthesizedContentId: string) => Promise<void>;
  answerQuestion: (isCorrect: boolean) => void;
  /** Returns the finished attempt's id so the caller can claim points for it. */
  completeQuiz: () => Promise<string | null>;

  // Flashcard actions
  getFlashcardsForClass: (classId: string) => Flashcard[];

  // Quiz enforcement
  getOverdueQuizzes: (classId: string) => SynthesizedContent[];
  getAllOverdueQuizzes: () => SynthesizedContent[];
  getNextQuizDeadline: (classId: string) => string | null;

  // Reading streak
  fetchClassPrompts: (userId: string, classId: string) => Promise<StudyPrompt[]>;
  recordChunkRead: (promptId: string) => Promise<ChunkReadResult | null>;

  // Points
  awardPoints: (reason: PointsReason, refId: string) => Promise<PointsResult | null>;

  // Advance chunk requests
  requestNextChunk: (classId: string, spendPoints?: boolean) => Promise<any>;
}

export const useStudyStore = create<StudyState>((set, get) => ({
  synthesizedContent: [],
  studyPrompts: [],
  todaysPrompts: [],
  currentQuiz: null,
  isLoading: false,
  isSynthesizing: false,
  error: null,

  fetchSynthesizedContent: async (userId: string, classId?: string) => {
    try {
      set({ isLoading: true, error: null });

      let query = supabase
        .from('synthesized_content')
        .select('*')
        .eq('user_id', userId)
        .order('session_date', { ascending: false });

      if (classId) {
        query = query.eq('class_id', classId);
      }

      const { data, error } = await query;

      if (error) throw error;
      set({ synthesizedContent: data, isLoading: false });
    } catch (error) {
      console.error('Fetch synthesized content error:', error);
      set({ isLoading: false, error: 'Failed to load study content. Pull down to retry.' });
    }
  },

  fetchStudyPrompts: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('study_prompts')
        .select('*')
        .eq('user_id', userId)
        .order('scheduled_for', { ascending: false })
        .limit(50);

      if (error) throw error;
      set({ studyPrompts: data, isLoading: false });
    } catch (error) {
      console.error('Fetch study prompts error:', error);
      set({ isLoading: false, error: 'Failed to load study nuggets. Pull down to retry.' });
    }
  },

  fetchTodaysPrompts: async (userId: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from('study_prompts')
        .select('*')
        .eq('user_id', userId)
        .gte('scheduled_for', today.toISOString())
        .lt('scheduled_for', tomorrow.toISOString())
        .order('scheduled_for');

      if (error) throw error;
      set({ todaysPrompts: data });
    } catch (error) {
      console.error('Fetch todays prompts error:', error);
    }
  },

  markPromptAsRead: async (promptId: string) => {
    try {
      const { error } = await supabase
        .from('study_prompts')
        .update({ read_at: new Date().toISOString() })
        .eq('id', promptId);

      if (error) throw error;

      set((state) => ({
        studyPrompts: state.studyPrompts.map((p) =>
          p.id === promptId ? { ...p, read_at: new Date().toISOString() } : p
        ),
        todaysPrompts: state.todaysPrompts.map((p) =>
          p.id === promptId ? { ...p, read_at: new Date().toISOString() } : p
        ),
      }));
    } catch (error) {
      console.error('Mark prompt as read error:', error);
    }
  },

  synthesizeContent: async (classId: string, userId: string, sessionDate: string) => {
    try {
      set({ isSynthesizing: true });

      // Fetch class info and sessions for context
      const { data: classData } = await supabase
        .from('classes')
        .select('name')
        .eq('id', classId)
        .single();

      const { data: sessions } = await supabase
        .from('class_sessions')
        .select('day_of_week, start_time')
        .eq('class_id', classId);

      let numStudyDays = 7;
      if (sessions && sessions.length > 0) {
        const now = new Date();
        const currentDay = now.getDay();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        let minDaysAway = Infinity;

        for (const session of sessions as any[]) {
          const targetDay = session.day_of_week;
          const [sh, sm] = session.start_time.split(':');
          const sessionMinutes = parseInt(sh) * 60 + parseInt(sm);
          let daysAway = targetDay - currentDay;
          if (daysAway < 0) daysAway += 7;
          if (daysAway === 0 && currentMinutes >= sessionMinutes) daysAway = 7;
          if (daysAway < minDaysAway) minDaysAway = daysAway;
        }
        if (minDaysAway < 2) minDaysAway += 7;
        numStudyDays = Math.max(1, Math.min(minDaysAway - 1, 14));
      }

      // Fetch notes and uploads for this class/date
      const { data: notes } = await supabase
        .from('notes')
        .select('*')
        .eq('class_id', classId)
        .eq('user_id', userId)
        .eq('session_date', sessionDate);

      const { data: uploads } = await supabase
        .from('uploads')
        .select('*')
        .eq('class_id', classId)
        .eq('user_id', userId)
        .eq('session_date', sessionDate);

      // Combine all text content
      const notesContent =
        notes
          ?.map((n) => n.content)
          .filter(Boolean)
          .join('\n\n') || '';
      const uploadsText =
        uploads
          ?.map((u) => u.extracted_text)
          .filter(Boolean)
          .join('\n\n') || '';
      const combinedContent = `${notesContent}\n\n${uploadsText}`.trim();

      if (!combinedContent) {
        throw new Error('No content to synthesize');
      }

      // Call AI synthesis endpoint (Edge Function)
      const { data: synthesisResult, error: synthesisError } = await supabase.functions.invoke(
        'synthesize-content',
        {
          body: {
            content: combinedContent,
            classId,
            sessionDate,
            className: classData?.name,
            numStudyDays,
          },
        }
      );

      if (synthesisError) throw synthesisError;

      // Store synthesized content
      const { data, error } = await supabase
        .from('synthesized_content')
        .insert({
          class_id: classId,
          user_id: userId,
          session_date: sessionDate,
          summary: synthesisResult.summary,
          key_takeaways: synthesisResult.keyTakeaways,
          flashcards: synthesisResult.flashcards,
          quiz_questions: synthesisResult.quizQuestions,
          daily_chunks: synthesisResult.dailyChunks,
          source_note_ids: notes?.map((n) => n.id) || [],
          source_upload_ids: uploads?.map((u) => u.id) || [],
        })
        .select()
        .single();

      if (error) throw error;

      // Schedule study prompts based on daily chunks
      if (synthesisResult.dailyChunks && synthesisResult.dailyChunks.length > 0) {
        try {
          await supabase.functions.invoke('schedule-prompts', {
            body: {
              classId,
              className: classData?.name,
              synthesizedContentId: data.id,
              dailyChunks: synthesisResult.dailyChunks,
              startDate: new Date().toISOString(),
            },
          });
        } catch (scheduleError) {
          console.error('Failed to schedule prompts:', scheduleError);
          // Don't throw - synthesis was successful, prompts can be retried
        }
      }

      // Mark notes as synthesized
      if (notes && notes.length > 0) {
        await supabase
          .from('notes')
          .update({ is_synthesized: true })
          .in(
            'id',
            notes.map((n) => n.id)
          );
      }

      set((state) => ({
        synthesizedContent: [data, ...state.synthesizedContent],
        isSynthesizing: false,
      }));

      return data;
    } catch (error) {
      set({ isSynthesizing: false });
      throw error;
    }
  },

  startQuiz: async (classId: string, userId: string, synthesizedContentId: string) => {
    try {
      // Get the synthesized content
      const content = get().synthesizedContent.find((c) => c.id === synthesizedContentId);
      if (!content) throw new Error('Content not found');

      const questions = content.quiz_questions as QuizQuestion[];
      if (!questions || questions.length === 0) {
        throw new Error('No quiz questions available');
      }

      // Create quiz attempt
      const { data, error } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id: userId,
          class_id: classId,
          synthesized_content_id: synthesizedContentId,
        })
        .select()
        .single();

      if (error) throw error;

      set({
        currentQuiz: {
          attempt: data,
          questions,
          currentIndex: 0,
        },
      });
    } catch (error) {
      console.error('Start quiz error:', error);
      throw error;
    }
  },

  answerQuestion: (isCorrect: boolean) => {
    const { currentQuiz } = get();
    if (!currentQuiz || !currentQuiz.attempt) return;

    set({
      currentQuiz: {
        ...currentQuiz,
        attempt: {
          ...currentQuiz.attempt,
          questions_answered: currentQuiz.attempt.questions_answered + 1,
          correct_answers: currentQuiz.attempt.correct_answers + (isCorrect ? 1 : 0),
        },
        currentIndex: currentQuiz.currentIndex + 1,
      },
    });
  },

  completeQuiz: async () => {
    const { currentQuiz } = get();
    if (!currentQuiz || !currentQuiz.attempt) return null;

    const {
      id: attemptId,
      questions_answered,
      correct_answers,
      synthesized_content_id,
    } = currentQuiz.attempt;
    const passed =
      questions_answered > 0 && correct_answers / questions_answered >= QUIZ_PASS_THRESHOLD;

    try {
      const { error } = await supabase
        .from('quiz_attempts')
        .update({
          questions_answered,
          correct_answers,
          completed_at: new Date().toISOString(),
        })
        .eq('id', attemptId);

      if (error) throw error;

      // Only a pass clears the block. The server re-verifies this from
      // quiz_attempts, so this optimistic reset is just for immediate UI feedback
      // — a failing attempt leaves the overdue badge in place.
      if (passed && synthesized_content_id) {
        await supabase
          .from('synthesized_content')
          .update({ quiz_deadline_notified: 0 })
          .eq('id', synthesized_content_id);
      }

      set((state) => ({
        currentQuiz: null,
        synthesizedContent:
          passed && synthesized_content_id
            ? state.synthesizedContent.map((c) =>
                c.id === synthesized_content_id ? { ...c, quiz_deadline_notified: 0 } : c
              )
            : state.synthesizedContent,
      }));

      return attemptId;
    } catch (error) {
      console.error('Complete quiz error:', error);
      return null;
    }
  },

  getFlashcardsForClass: (classId: string) => {
    const { synthesizedContent } = get();
    const classContent = synthesizedContent.filter((c) => c.class_id === classId);

    return classContent.flatMap((c) => (c.flashcards as Flashcard[]) || []);
  },

  getOverdueQuizzes: (classId: string) => {
    const { synthesizedContent } = get();
    const today = new Date().toISOString().split('T')[0];
    return synthesizedContent.filter(
      (c) =>
        c.class_id === classId &&
        c.next_class_date &&
        c.next_class_date <= today &&
        c.quiz_deadline_notified > 0
    );
  },

  getAllOverdueQuizzes: () => {
    const { synthesizedContent } = get();
    const today = new Date().toISOString().split('T')[0];
    return synthesizedContent.filter(
      (c) => c.next_class_date && c.next_class_date <= today && c.quiz_deadline_notified > 0
    );
  },

  getNextQuizDeadline: (classId: string) => {
    const { synthesizedContent } = get();
    const today = new Date().toISOString().split('T')[0];
    const upcoming = synthesizedContent
      .filter((c) => c.class_id === classId && c.next_class_date && c.next_class_date > today)
      .sort((a, b) => (a.next_class_date || '').localeCompare(b.next_class_date || ''));
    return upcoming.length > 0 ? upcoming[0].next_class_date : null;
  },

  fetchClassPrompts: async (userId: string, classId: string) => {
    try {
      const { data, error } = await supabase
        .from('study_prompts')
        .select('*')
        .eq('user_id', userId)
        .eq('class_id', classId)
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      return (data || []) as StudyPrompt[];
    } catch (error) {
      console.error('Fetch class prompts error:', error);
      return [];
    }
  },

  recordChunkRead: async (promptId: string) => {
    try {
      const { data, error } = await supabase.rpc('record_chunk_read', {
        p_prompt_id: promptId,
      });

      if (error) throw error;

      const result = data as unknown as ChunkReadResult;
      patchProfile({ paly_points: result.total, reading_streak: result.reading_streak });
      return result;
    } catch (error) {
      console.error('Record chunk read error:', error);
      return null;
    }
  },

  awardPoints: async (reason: PointsReason, refId: string) => {
    try {
      const { data, error } = await supabase.rpc('award_paly_points', {
        p_reason: reason,
        p_ref_id: refId,
      });

      if (error) throw error;

      const result = data as unknown as PointsResult;
      patchProfile({ paly_points: result.total });

      // The server grants the free month once the monthly threshold is crossed;
      // it re-verifies the balance, so a spoofed call here achieves nothing.
      if (result.awarded && result.total >= PALY_POINTS_FREE_MONTH_THRESHOLD) {
        supabase.functions
          .invoke('grant-free-month')
          .catch((err) => console.error('grant-free-month error:', err));
      }

      return result;
    } catch (error) {
      console.error('Award points error:', error);
      return null;
    }
  },

  requestNextChunk: async (classId: string, spendPoints = false) => {
    try {
      const { data, error } = await supabase.functions.invoke('request-chunk', {
        body: { classId, spendPoints },
      });

      // Non-2xx responses arrive as a FunctionsHttpError whose body holds the
      // structured error the UI needs (weekly_limit_reached, insufficient_points…).
      if (error) {
        const context = (error as { context?: Response }).context;
        if (context && typeof context.json === 'function') {
          return await context.json();
        }
        throw error;
      }

      // An advance request can spend points, so re-read the authoritative total.
      if (data?.usage) {
        void useAuthStore.getState().fetchProfile();
      }

      return data;
    } catch (error) {
      console.error('Request chunk error:', error);
      return { error: 'request_failed', message: 'Could not reach Paly. Please try again.' };
    }
  },
}));
