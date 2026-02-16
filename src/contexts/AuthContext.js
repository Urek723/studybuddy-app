import React, { createContext, useState, useContext, useEffect } from 'react';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../config/supabase';

// Complete the auth session when returning from browser
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

  // Helper function to ensure profile exists
  const ensureProfileExists = async (user) => {
    if (!user) return;

    try {
      console.log('Checking profile for:', user.email);

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingProfile) {
        console.log('Profile not found, creating...');
        
        // Create profile
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email.split('@')[0],
            profile_completed: false,
          });

        if (insertError) {
          console.error('Error creating profile:', insertError);
        } else {
          console.log('Profile created successfully for:', user.email);
        }
      } else {
        console.log('Profile already exists for:', user.email);
      }
    } catch (error) {
      console.error('Error ensuring profile exists:', error);
    }
  };

  // Check session on mount and when app becomes active
  useEffect(() => {
    // Initial session check
    checkSession();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session ? 'has session' : 'no session');
        
        if (session?.user) {
          // Always ensure profile exists when user signs in
          await ensureProfileExists(session.user);
        }
        
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Listen for app state changes (foreground/background)
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

  // Handle OAuth callback from deep link
  useEffect(() => {
    const handleDeepLink = async ({ url }) => {
      if (!url) return;

      console.log('Deep link received:', url);

      try {
        // Parse the URL
        const parsed = Linking.parse(url);
        const params = parsed?.queryParams ?? {};

        const access_token = params.access_token;
        const refresh_token = params.refresh_token;

        // Supabase mobile OAuth returns tokens in the hash (#), not query (?)
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
              
              // Ensure profile exists after OAuth
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
        // Ensure profile exists on session check
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
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Email sign in error:', error);
        return { error };
      }

      console.log('Email sign in successful:', data.user.email);
      
      // Ensure profile exists
      await ensureProfileExists(data.user);
      
      setUser(data.user);
      return { error: null };
    } catch (error) {
      console.error('Sign in exception:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      
      // Create the redirect URL for your app
      const redirectUrl = 'com.studybuddy.app://';
      console.log('Generated redirect URL:', redirectUrl);

      // Start OAuth flow
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

      // Open the browser for authentication
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        'com.studybuddy.app://'
      );

      console.log('WebBrowser result:', result);

      if (result.type === 'success') {
        // The deep link listener will handle the session and profile creation
        console.log('Auth session completed successfully');
        return { error: null };
      } else if (result.type === 'dismiss') {
        console.log('User dismissed the auth session');
        setLoading(false);
        return { error: { message: 'Authentication cancelled' } };
      } else if (result.type === 'cancel') {
        console.log('User cancelled the auth session');
        setLoading(false);
        return { error: { message: 'Authentication cancelled' } };
      }

      setLoading(false);
      return { error: null };
    } catch (error) {
      console.error('Google sign in error:', error);
      setLoading(false);
      return { error };
    }
  };

  const signUpWithEmail = async (email, password, fullName) => {
    try {
      setLoading(true);
      
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

      // Ensure profile exists
      if (data.user) {
        await ensureProfileExists(data.user);
        setUser(data.user);
      }

      return { error: null };
    } catch (error) {
      console.error('Sign up exception:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
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