import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    try {
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        set({ user: session.user, session });
        await get().fetchProfile();
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        set({ user: session?.user ?? null, session });
        
        if (session?.user) {
          await get().fetchProfile();
        } else {
          set({ profile: null });
        }
      });

      set({ isLoading: false, isInitialized: true });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ isLoading: false, isInitialized: true });
    }
  },

  signUp: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      const { error } = await supabase.auth.signUp({ email, password });
      set({ isLoading: false });
      return { error: error as Error | null };
    } catch (error) {
      set({ isLoading: false });
      return { error: error as Error };
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      set({ isLoading: false });
      return { error: error as Error | null };
    } catch (error) {
      set({ isLoading: false });
      return { error: error as Error };
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true });
      await supabase.auth.signOut();
      set({ user: null, session: null, profile: null, isLoading: false });
    } catch (error) {
      console.error('Sign out error:', error);
      set({ isLoading: false });
    }
  },

  resetPassword: async (email: string) => {
    try {
      set({ isLoading: true });
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'paly://reset-password',
      });
      set({ isLoading: false });
      return { error: error as Error | null };
    } catch (error) {
      set({ isLoading: false });
      return { error: error as Error };
    }
  },

  deleteAccount: async () => {
    try {
      set({ isLoading: true });
      const { user } = get();
      if (!user) {
        set({ isLoading: false });
        return { error: new Error('No user logged in') };
      }
      const { error } = await supabase.functions.invoke('delete-account', {
        body: { userId: user.id },
      });
      if (error) {
        set({ isLoading: false });
        return { error: error as Error };
      }
      await supabase.auth.signOut();
      set({ user: null, session: null, profile: null, isLoading: false });
      return { error: null };
    } catch (error) {
      set({ isLoading: false });
      return { error: error as Error };
    }
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      set({ profile: data });
    } catch (error) {
      console.error('Fetch profile error:', error);
    }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const { user, profile } = get();
    if (!user || !profile) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      set({ profile: data });
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },
}));

