import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { SynthesizedContent, StudyPrompt, QuizAttempt, Flashcard, QuizQuestion } from '../types/database';

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
  
  // Actions
  fetchSynthesizedContent: (userId: string, classId?: string) => Promise<void>;
  fetchStudyPrompts: (userId: string) => Promise<void>;
  fetchTodaysPrompts: (userId: string) => Promise<void>;
  markPromptAsRead: (promptId: string) => Promise<void>;
  synthesizeContent: (classId: string, userId: string, sessionDate: string) => Promise<SynthesizedContent>;
  
  // Quiz actions
  startQuiz: (classId: string, userId: string, synthesizedContentId: string) => Promise<void>;
  answerQuestion: (isCorrect: boolean) => void;
  completeQuiz: () => Promise<void>;
  
  // Flashcard actions
  getFlashcardsForClass: (classId: string) => Flashcard[];

  // Quiz enforcement
  getOverdueQuizzes: (classId: string) => SynthesizedContent[];
  getAllOverdueQuizzes: () => SynthesizedContent[];
  getNextQuizDeadline: (classId: string) => string | null;
}

export const useStudyStore = create<StudyState>((set, get) => ({
  synthesizedContent: [],
  studyPrompts: [],
  todaysPrompts: [],
  currentQuiz: null,
  isLoading: false,
  isSynthesizing: false,

  fetchSynthesizedContent: async (userId: string, classId?: string) => {
    try {
      set({ isLoading: true });
      
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
      set({ isLoading: false });
    }
  },

  fetchStudyPrompts: async (userId: string) => {
    try {
      set({ isLoading: true });
      
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
      set({ isLoading: false });
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

      set(state => ({
        studyPrompts: state.studyPrompts.map(p =>
          p.id === promptId ? { ...p, read_at: new Date().toISOString() } : p
        ),
        todaysPrompts: state.todaysPrompts.map(p =>
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

      // Fetch class info for context
      const { data: classData } = await supabase
        .from('classes')
        .select('name')
        .eq('id', classId)
        .single();

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
      const notesContent = notes?.map(n => n.content).filter(Boolean).join('\n\n') || '';
      const uploadsText = uploads?.map(u => u.extracted_text).filter(Boolean).join('\n\n') || '';
      const combinedContent = `${notesContent}\n\n${uploadsText}`.trim();

      if (!combinedContent) {
        throw new Error('No content to synthesize');
      }

      // Call AI synthesis endpoint (Edge Function)
      const { data: synthesisResult, error: synthesisError } = await supabase.functions.invoke('synthesize-content', {
        body: {
          content: combinedContent,
          classId,
          sessionDate,
          className: classData?.name,
        },
      });

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
          source_note_ids: notes?.map(n => n.id) || [],
          source_upload_ids: uploads?.map(u => u.id) || [],
        })
        .select()
        .single();

      if (error) throw error;

      // Schedule study prompts based on daily chunks
      if (synthesisResult.dailyChunks && synthesisResult.dailyChunks.length > 0) {
        try {
          await supabase.functions.invoke('schedule-prompts', {
            body: {
              userId,
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
          .in('id', notes.map(n => n.id));
      }

      set(state => ({
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
      const content = get().synthesizedContent.find(c => c.id === synthesizedContentId);
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
    if (!currentQuiz || !currentQuiz.attempt) return;

    try {
      const { error } = await supabase
        .from('quiz_attempts')
        .update({
          questions_answered: currentQuiz.attempt.questions_answered,
          correct_answers: currentQuiz.attempt.correct_answers,
          completed_at: new Date().toISOString(),
        })
        .eq('id', currentQuiz.attempt.id);

      if (error) throw error;

      set({ currentQuiz: null });
    } catch (error) {
      console.error('Complete quiz error:', error);
    }
  },

  getFlashcardsForClass: (classId: string) => {
    const { synthesizedContent } = get();
    const classContent = synthesizedContent.filter(c => c.class_id === classId);
    
    return classContent.flatMap(c => (c.flashcards as Flashcard[]) || []);
  },

  getOverdueQuizzes: (classId: string) => {
    const { synthesizedContent } = get();
    const today = new Date().toISOString().split('T')[0];
    return synthesizedContent.filter(
      c => c.class_id === classId && c.next_class_date && c.next_class_date <= today && c.quiz_deadline_notified > 0
    );
  },

  getAllOverdueQuizzes: () => {
    const { synthesizedContent } = get();
    const today = new Date().toISOString().split('T')[0];
    return synthesizedContent.filter(
      c => c.next_class_date && c.next_class_date <= today && c.quiz_deadline_notified > 0
    );
  },

  getNextQuizDeadline: (classId: string) => {
    const { synthesizedContent } = get();
    const today = new Date().toISOString().split('T')[0];
    const upcoming = synthesizedContent
      .filter(c => c.class_id === classId && c.next_class_date && c.next_class_date > today)
      .sort((a, b) => (a.next_class_date || '').localeCompare(b.next_class_date || ''));
    return upcoming.length > 0 ? upcoming[0].next_class_date : null;
  },
}));


