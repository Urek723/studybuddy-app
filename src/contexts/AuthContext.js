import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../config/supabase';

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const ensureProfileExists = useCallback(async (authUser) => {
    if (!authUser) return;
    try {
      const { data: existingProfile, error: selectError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authUser.id)
        .maybeSingle();

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('Error selecting profile:', selectError);
        return;
      }

      if (!existingProfile) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
            profile_completed: false,
          });

        if (insertError && insertError.code !== '23505') {
          console.error('Error creating profile:', insertError);
        }
      }
    } catch (error) {
      console.error('Error ensuring profile exists:', error);
    }
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) console.error('Session check error:', error);
      if (session?.user) await ensureProfileExists(session.user);
      setUser(session?.user ?? null);
    } catch (error) {
      console.error('Error checking session:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [ensureProfileExists]);

  useEffect(() => {
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') checkSession();
    });

    return () => {
      authListener?.subscription?.unsubscribe();
      appStateSubscription?.remove();
    };
  }, [checkSession]);

  // FIX #9: stable reference for handleDeepLink so it always sees current ensureProfileExists
  const handleDeepLink = useCallback(async ({ url }) => {
    if (!url) return;
    try {
      const parsed = Linking.parse(url);
      const params = parsed?.queryParams ?? {};
      const access_token = params.access_token;

      if (!access_token && url.includes('#')) {
        const hash = url.split('#')[1];
        const hashParams = Object.fromEntries(hash.split('&').map(p => p.split('=')));

        if (hashParams.access_token && hashParams.refresh_token) {
          setLoading(true);
          const { data, error } = await supabase.auth.setSession({
            access_token: hashParams.access_token,
            refresh_token: hashParams.refresh_token,
          });
          if (error) {
            console.error('Session restore error:', error);
          } else {
            await ensureProfileExists(data.session.user);
            setUser(data.session.user);
          }
          setLoading(false);
        }
      }
    } catch (e) {
      console.error('OAuth processing error:', e);
      setLoading(false);
    }
  }, [ensureProfileExists]);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((url) => { if (url) handleDeepLink({ url }); });
    return () => subscription.remove();
  }, [handleDeepLink]);

  const signInWithEmail = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error };
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUrl = 'com.studybuddy.app://';
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;
      const result = await WebBrowser.openAuthSessionAsync(data.url, 'com.studybuddy.app://');
      if (result.type === 'success') return { error: null };
      if (result.type === 'dismiss' || result.type === 'cancel') {
        return { error: { message: 'Authentication cancelled' } };
      }
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signUpWithEmail = async (email, password, fullName) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) return { error };
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return { error };
      setUser(null);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithEmail, signInWithGoogle, signUpWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};