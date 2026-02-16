import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// IMPORTANT: Replace these with your Supabase project credentials
// Get them from https://app.supabase.com/project/_/settings/api
const SUPABASE_URL = 'https://zlrurnxpntyrpasyflkt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpscnVybnhwbnR5cnBhc3lmbGt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMjUzMzEsImV4cCI6MjA4NTkwMTMzMX0.2MAJ4I8VaVwCKcw5YMFlgKXojjFzyqVDr8kvUipnJR4';

// Custom storage implementation using SecureStore for better security
const ExpoSecureStoreAdapter = {
  getItem: async (key) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Error getting item:', error);
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Error setting item:', error);
    }
  },
  removeItem: async (key) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
