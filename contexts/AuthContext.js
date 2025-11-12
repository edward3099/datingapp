import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';
import { logger } from '../utils/logger';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [lastAuthAction, setLastAuthAction] = useState(null);

  useEffect(() => {
    // Get initial session
    authService.getSession()
      .then(({ session: initialSession }) => {
        setSession(initialSession);
        setUser(initialSession?.user || null);
        setLoading(false);

        if (initialSession?.user) {
          setLastAuthAction('signin');
        }

        if (initialSession?.user) {
          loadProfile(initialSession.user.id).catch((error) => {
            logger.error('Failed to load profile on init', {
              error: error?.message || String(error),
              stack: error?.stack,
              userId: initialSession.user.id,
            });
          });
        }
      })
      .catch((error) => {
        logger.error('Failed to get initial session', {
          error: error?.message || String(error),
          stack: error?.stack,
        });
        setLoading(false);
      });

    // Listen to auth state changes
    try {
      const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
        try {
          logger.info('Auth state changed', { event });
          setSession(session);
          setUser(session?.user || null);

          if (session?.user) {
            setLastAuthAction('signin');
            await loadProfile(session.user.id);
          } else {
            setLastAuthAction(null);
            setProfile(null);
          }
        } catch (error) {
          logger.error('Error in auth state change handler', {
            error: error?.message || String(error),
            stack: error?.stack,
            event,
          });
        }
      });

      return () => {
        try {
          subscription?.unsubscribe();
        } catch (error) {
          logger.error('Error unsubscribing from auth state', {
            error: error?.message || String(error),
          });
        }
      };
    } catch (error) {
      logger.error('Error setting up auth state listener', {
        error: error?.message || String(error),
        stack: error?.stack,
      });
    }
  }, []);

  const loadProfile = async (userId) => {
    try {
      const { profile: userProfile, error } = await profileService.getMyProfile();
      if (error) throw error;
      setProfile(userProfile || null);
      return userProfile || null;
    } catch (error) {
      logger.error('Load profile error', {
        error: error?.message || String(error),
        stack: error?.stack,
        userId,
        errorDetails: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      });
      // Don't throw - just log the error
      return null;
    }
  };

  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const { user: signedInUser, session: newSession, error } = await authService.signIn(email, password);
      if (error) {
        throw error;
      }

      setUser(signedInUser);
      setSession(newSession);

      let profileData = null;
      if (signedInUser) {
        profileData = await loadProfile(signedInUser.id);
      }

      setLastAuthAction('signin');

      if (!profileData) {
        setProfile((prev) => prev ?? { onboarding_state: 'complete' });
      }

      return { user: signedInUser, error: null };
    } catch (error) {
      if (error?.code === 'invalid_credentials') {
        logger.warn?.('Sign in rejected: invalid credentials', { email });
        return { user: null, error };
      }
      logger.error('Sign in error', {
        error: error?.message || String(error),
        stack: error?.stack,
        code: error?.code,
      });
      return { user: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password) => {
    setLoading(true);
    try {
      const { user: newUser, session: newSession, error } = await authService.signUp(email, password);
      if (error) {
        throw error;
      }

      setUser(newUser);
      setSession(newSession);

      if (newUser) {
        setLastAuthAction('signup');
        // Profile is auto-created by trigger, wait a bit then load
        setTimeout(() => {
          loadProfile(newUser.id).catch((error) => {
            logger.error('Failed to load profile after signup', {
              error: error?.message || String(error),
              stack: error?.stack,
              userId: newUser.id,
            });
          });
        }, 1000);
      }

      return { user: newUser, error: null };
    } catch (error) {
      logger.error('Sign up error', { error: error.message });
      return { user: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await authService.signOut();
      if (error) throw error;

      setUser(null);
      setProfile(null);
      setSession(null);
      setLastAuthAction(null);

      return { error: null };
    } catch (error) {
      logger.error('Sign out error', { error: error.message });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    try {
      const { profile: updatedProfile, error } = await profileService.updateProfile(updates);
      if (error) throw error;

      setProfile(updatedProfile);
      return { profile: updatedProfile, error: null };
    } catch (error) {
      logger.error('Update profile error', { error: error.message });
      return { profile: null, error };
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile: () => user && loadProfile(user.id),
    isAuthenticated: !!user,
    onboardingComplete: profile?.onboarding_state === 'complete' || lastAuthAction === 'signin',
    lastAuthAction,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

