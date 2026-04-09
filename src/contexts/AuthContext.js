import React, { createContext, useState, useContext, useEffect } from 'react';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../config/supabase';

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const ensureProfileExists = async (authUser) => {
    if (!authUser) return;

    try {
      console.log('Checking profile for:', authUser.email);

      const { data: existingProfile, error: selectError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authUser.id)
        .maybeSingle();

      if (selectError) {
        if (selectError.code !== 'PGRST116') {
          console.error('Error selecting profile:', selectError);
          return;
        }
      }

      if (!existingProfile) {
        console.log('Profile not found, creating...');

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
        } else {
          console.log('Profile created successfully for:', authUser.email);
        }
      } else {
        console.log('Profile already exists for:', authUser.email);
      }
    } catch (error) {
      console.error('Error ensuring profile exists:', error);
    }
  };

  useEffect(() => {
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session ? 'has session' : 'no session');

        // Do NOT call ensureProfileExists here — RLS context is not yet propagated
        // when onAuthStateChange fires, causing the SELECT to hang indefinitely.
        // checkSession() handles profile creation after the session is fully stable.
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('App active → re-checking session');
        checkSession();
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
      appStateSubscription?.remove();
    };
  }, []);

  useEffect(() => {
    const handleDeepLink = async ({ url }) => {
      if (!url) return;

      console.log('Deep link received:', url);

      try {
        const parsed = Linking.parse(url);
        const params = parsed?.queryParams ?? {};

        const access_token = params.access_token;

        if (!access_token && url.includes('#')) {
          const hash = url.split('#')[1];
          const hashParams = Object.fromEntries(
            hash.split('&').map(param => param.split('='))
          );

          if (hashParams.access_token && hashParams.refresh_token) {
            console.log('Tokens found in deep link');

            setLoading(true);

            const { data, error } = await supabase.auth.setSession({
              access_token: hashParams.access_token,
              refresh_token: hashParams.refresh_token,
            });

            if (error) {
              console.error('Session restore error:', error);
            } else {
              console.log('User signed in:', data.session.user.email);
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
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => subscription.remove();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('Session check on mount/active:', session ? session.user.email : 'none');

      if (error) {
        console.error('Session check error:', error);
      }

      if (session?.user) {
        await ensureProfileExists(session.user);
      }

      setUser(session?.user ?? null);
    } catch (error) {
      console.error('Error checking session:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Email sign in error:', error);
        return { error };
      }

      console.log('Email sign in successful:', data.user.email);
      return { error: null };
    } catch (error) {
      console.error('Sign in exception:', error);
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUrl = 'com.studybuddy.app://';
      console.log('Generated redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error('OAuth initiation error:', error);
        throw error;
      }

      console.log('Opening Google auth URL:', data.url);

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        'com.studybuddy.app://'
      );

      console.log('WebBrowser result:', result);

      if (result.type === 'success') {
        console.log('Auth session completed successfully');
        return { error: null };
      } else if (result.type === 'dismiss') {
        console.log('User dismissed the auth session');
        return { error: { message: 'Authentication cancelled' } };
      } else if (result.type === 'cancel') {
        console.log('User cancelled the auth session');
        return { error: { message: 'Authentication cancelled' } };
      }

      return { error: null };
    } catch (error) {
      console.error('Google sign in error:', error);
      return { error };
    }
  };

  const signUpWithEmail = async (email, password, fullName) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        console.error('Sign up error:', error);
        return { error };
      }

      console.log('Sign up successful:', data.user?.email);
      return { error: null };
    } catch (error) {
      console.error('Sign up exception:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Sign out error:', error);
        return { error };
      }

      console.log('Sign out successful');
      setUser(null);
      return { error: null };
    } catch (error) {
      console.error('Sign out exception:', error);
      return { error };
    }
  };

  const value = {
    user,
    loading,
    signInWithEmail,
    signInWithGoogle,
    signUpWithEmail,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};