import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { Database } from '../types/database';

const supabaseUrl = 'https://eftafqxzqijsueviocsv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmdGFmcXh6cWlqc3VldmlvY3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3OTc4MjIsImV4cCI6MjA4MjM3MzgyMn0.vHbK0Wc_tT2WJbqZevZjY2v41Wr0RC7MQTNmJ9czLNo';

// Create a web-compatible storage wrapper
const createStorage = () => {
  // Check if we're in a browser/client environment
  if (typeof window !== 'undefined' && Platform.OS === 'web') {
    return {
      getItem: (key: string) => {
        const item = localStorage.getItem(key);
        return Promise.resolve(item);
      },
      setItem: (key: string, value: string) => {
        localStorage.setItem(key, value);
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        localStorage.removeItem(key);
        return Promise.resolve();
      },
    };
  }
  // For native platforms, use AsyncStorage
  return AsyncStorage;
};

// Only create the client on the client side or native
let _supabase: SupabaseClient<Database> | null = null;

export const getSupabase = () => {
  if (!_supabase) {
    _supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: createStorage(),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return _supabase;
};

// For backwards compatibility - lazy initialization
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    return Reflect.get(getSupabase(), prop);
  },
});

// Helper functions for common operations
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
};

export const updateProfile = async (userId: string, updates: Partial<Database['public']['Tables']['profiles']['Update']>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

