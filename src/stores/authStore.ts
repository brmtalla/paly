import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { EMAIL_CONFIRM_REDIRECT_URL, PASSWORD_RESET_REDIRECT_URL } from '../lib/authLinks';
import { Profile, ProfileUpdate } from '../types/database';
import { getAppleCredential, getGoogleIdToken } from '../lib/socialAuth';

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
  signInWithApple: () => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  /** Internal: seeds the display name from a provider on first sign-in. */
  persistFullNameIfEmpty: (fullName: string) => Promise<void>;
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

  /**
   * Apple and Google both hand back an ID token that Supabase verifies itself,
   * so there is no browser redirect and no session to reconcile by hand — the
   * onAuthStateChange listener above picks up SIGNED_IN exactly as it does for
   * a password login, and the on_auth_user_created trigger creates the profile.
   */
  signInWithApple: async () => {
    try {
      set({ isLoading: true });
      const { identityToken, fullName } = await getAppleCredential();

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: identityToken,
      });
      if (error) throw error;

      // Apple returns the name only on the first authorisation ever, so it has
      // to be written now; there is no way to ask for it again later.
      if (fullName) await get().persistFullNameIfEmpty(fullName);

      set({ isLoading: false });
      return { error: null };
    } catch (error) {
      set({ isLoading: false });
      return { error: error as Error };
    }
  },

  signInWithGoogle: async () => {
    try {
      set({ isLoading: true });
      const { idToken, fullName } = await getGoogleIdToken();

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) throw error;

      if (fullName) await get().persistFullNameIfEmpty(fullName);

      set({ isLoading: false });
      return { error: null };
    } catch (error) {
      set({ isLoading: false });
      return { error: error as Error };
    }
  },

  /**
   * Only fills a blank name. A returning user may have edited theirs, and the
   * provider's value should not overwrite that on every sign-in.
   */
  persistFullNameIfEmpty: async (fullName: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const id = userData.user?.id;
      if (!id) return;

      const { data: existing } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', id)
        .single();

      if (existing?.full_name) return;
      await supabase.from('profiles').update({ full_name: fullName }).eq('id', id);
    } catch (error) {
      // A missing display name must never block a successful sign-in.
      console.warn('Could not persist provider name:', error);
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
