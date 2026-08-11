import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
  Class,
  ClassSession,
  ClassWithSessions,
  ClassInsert,
  ClassSessionInsert,
} from '../types/database';

interface ClassState {
  classes: ClassWithSessions[];
  currentClass: ClassWithSessions | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchClasses: (userId: string) => Promise<void>;
  createClass: (
    classData: ClassInsert,
    sessions: Omit<ClassSessionInsert, 'class_id'>[]
  ) => Promise<ClassWithSessions>;
  addClass: (
    classData: ClassInsert,
    sessions: Omit<ClassSessionInsert, 'class_id'>[]
  ) => Promise<ClassWithSessions>;
  updateClass: (classId: string, updates: Partial<Class>) => Promise<void>;
  deleteClass: (classId: string) => Promise<void>;
  addSession: (classId: string, session: Omit<ClassSessionInsert, 'class_id'>) => Promise<void>;
  updateSession: (sessionId: string, updates: Partial<ClassSession>) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  setCurrentClass: (classData: ClassWithSessions | null) => void;
  getTodaysClasses: () => ClassWithSessions[];
  getUpcomingClass: () => { classData: ClassWithSessions; session: ClassSession } | null;
}

export const useClassStore = create<ClassState>((set, get) => ({
  classes: [],
  currentClass: null,
  isLoading: false,
  error: null,

  fetchClasses: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('classes')
        .select(
          `
          *,
          class_sessions (*)
        `
        )
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      set({ classes: data as unknown as ClassWithSessions[], isLoading: false });
    } catch (error) {
      console.error('Fetch classes error:', error);
      set({ isLoading: false, error: 'Failed to load classes. Pull down to retry.' });
    }
  },

  createClass: async (classData, sessions) => {
    try {
      set({ isLoading: true });

      // Create the class
      const { data: newClass, error: classError } = await supabase
        .from('classes')
        .insert(classData)
        .select()
        .single();

      if (classError) throw classError;

      // Create sessions if provided
      if (sessions.length > 0) {
        const sessionsWithClassId = sessions.map((s) => ({
          ...s,
          class_id: newClass.id,
        }));

        const { data: newSessions, error: sessionsError } = await supabase
          .from('class_sessions')
          .insert(sessionsWithClassId)
          .select();

        if (sessionsError) throw sessionsError;

        const classWithSessions: ClassWithSessions = {
          ...newClass,
          class_sessions: newSessions,
        };

        set((state) => ({
          classes: [...state.classes, classWithSessions],
          isLoading: false,
        }));

        return classWithSessions;
      }

      const classWithSessions: ClassWithSessions = {
        ...newClass,
        class_sessions: [],
      };

      set((state) => ({
        classes: [...state.classes, classWithSessions],
        isLoading: false,
      }));

      return classWithSessions;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Alias for createClass
  addClass: async (classData, sessions) => {
    return get().createClass(classData, sessions);
  },

  updateClass: async (classId: string, updates: Partial<Class>) => {
    try {
      const { error } = await supabase.from('classes').update(updates).eq('id', classId);

      if (error) throw error;

      set((state) => ({
        classes: state.classes.map((c) => (c.id === classId ? { ...c, ...updates } : c)),
      }));
    } catch (error) {
      console.error('Update class error:', error);
      throw error;
    }
  },

  deleteClass: async (classId: string) => {
    try {
      const { error } = await supabase
        .from('classes')
        .update({ is_active: false })
        .eq('id', classId);

      if (error) throw error;

      set((state) => ({
        classes: state.classes.filter((c) => c.id !== classId),
      }));
    } catch (error) {
      console.error('Delete class error:', error);
      throw error;
    }
  },

  addSession: async (classId: string, session) => {
    try {
      const { data, error } = await supabase
        .from('class_sessions')
        .insert({ ...session, class_id: classId })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        classes: state.classes.map((c) =>
          c.id === classId ? { ...c, class_sessions: [...c.class_sessions, data] } : c
        ),
      }));
    } catch (error) {
      console.error('Add session error:', error);
      throw error;
    }
  },

  updateSession: async (sessionId: string, updates: Partial<ClassSession>) => {
    try {
      const { error } = await supabase.from('class_sessions').update(updates).eq('id', sessionId);

      if (error) throw error;

      set((state) => ({
        classes: state.classes.map((c) => ({
          ...c,
          class_sessions: c.class_sessions.map((s) =>
            s.id === sessionId ? { ...s, ...updates } : s
          ),
        })),
      }));
    } catch (error) {
      console.error('Update session error:', error);
      throw error;
    }
  },

  deleteSession: async (sessionId: string) => {
    try {
      const { error } = await supabase.from('class_sessions').delete().eq('id', sessionId);

      if (error) throw error;

      set((state) => ({
        classes: state.classes.map((c) => ({
          ...c,
          class_sessions: c.class_sessions.filter((s) => s.id !== sessionId),
        })),
      }));
    } catch (error) {
      console.error('Delete session error:', error);
      throw error;
    }
  },

  setCurrentClass: (classData: ClassWithSessions | null) => {
    set({ currentClass: classData });
  },

  getTodaysClasses: () => {
    const { classes } = get();
    const today = new Date().getDay(); // 0 = Sunday

    return classes.filter((c) => c.class_sessions.some((s) => s.day_of_week === today));
  },

  getUpcomingClass: () => {
    const { classes } = get();
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;

    // Find the next class
    for (const classData of classes) {
      for (const session of classData.class_sessions) {
        if (session.day_of_week === currentDay && session.start_time > currentTime) {
          return { classData, session };
        }
      }
    }

    return null;
  },
}));
