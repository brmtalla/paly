import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { EMAIL_CONFIRM_REDIRECT_URL, PASSWORD_RESET_REDIRECT_URL } from '../lib/authLinks';
import { Profile, ProfileUpdate } from '../types/database';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  isProfileReady: boolean;

  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
  fetchProfile: () => Promise<void>;
  /** Server-maintained fields (points, streaks, entitlement) are not writable here. */
  updateProfile: (updates: ProfileUpdate) => Promise<void>;
  /** Replaces the cached profile without a round trip (used after server RPCs). */
  setProfile: (profile: Profile) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isInitialized: false,
  isProfileReady: false,

  initialize: async () => {
    try {
      // Get initial session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        set({ user: session.user, session, isProfileReady: false });
        await get().fetchProfile();
      } else {
        set({ isProfileReady: true });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION') return;

        if (event === 'SIGNED_OUT' || !session?.user) {
          set({ user: null, session: null, profile: null, isProfileReady: true });
          return;
        }

        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          // Supabase can deadlock when another client call is awaited inside
          // this callback. Defer profile loading until the auth event returns.
          set({ user: session.user, session, isProfileReady: false });
          setTimeout(() => void get().fetchProfile(), 0);
        } else {
          set({ user: session.user, session });
        }
      });

      set({ isLoading: false, isInitialized: true });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ isLoading: false, isInitialized: true, isProfileReady: true });
    }
  },

  signUp: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: EMAIL_CONFIRM_REDIRECT_URL },
      });
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
      set({ user: null, session: null, profile: null, isLoading: false, isProfileReady: true });
    } catch (error) {
      console.error('Sign out error:', error);
      set({ isLoading: false, isProfileReady: true });
    }
  },

  resetPassword: async (email: string) => {
    try {
      set({ isLoading: true });
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: PASSWORD_RESET_REDIRECT_URL,
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
      set({ user: null, session: null, profile: null, isLoading: false, isProfileReady: true });
      return { error: null };
    } catch (error) {
      set({ isLoading: false });
      return { error: error as Error };
    }
  },

  setProfile: (profile: Profile) => set({ profile }),

  fetchProfile: async () => {
    const { user } = get();
    if (!user) {
      set({ isProfileReady: true });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      set({ profile: data, isProfileReady: true });
    } catch (error) {
      console.error('Fetch profile error:', error);
      set({ isProfileReady: true });
    }
  },

  updateProfile: async (updates: ProfileUpdate) => {
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
