import supabase from '../config/supabase';
import { logger } from '../utils/logger';

export const authService = {
  // Sign up with email and password
  async signUp(email, password) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Auto-confirm for development (if email confirmation is disabled)
          emailRedirectTo: undefined,
        },
      });

      if (error) throw error;

      logger.info('User signed up', { 
        userId: data.user?.id,
        emailConfirmed: !!data.user?.email_confirmed_at,
        needsConfirmation: !data.session && data.user,
      });

      // If user needs email confirmation, return user but no session
      if (!data.session && data.user) {
        return { 
          user: data.user, 
          session: null, 
          error: { 
            message: 'Please check your email to confirm your account',
            code: 'email_not_confirmed',
            needsConfirmation: true,
          }
        };
      }

      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      logger.error('Sign up error', { 
        error: error.message,
        code: error.code,
        status: error.status,
        statusText: error.statusText,
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      });
      return { user: null, session: null, error };
    }
  },

  // Resend confirmation email
  async resendConfirmationEmail(email) {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      logger.error('Resend confirmation error', { 
        error: error.message,
        code: error.code,
      });
      return { error };
    }
  },

  // Sign in with email and password
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      logger.info('User signed in', { userId: data.user?.id });
      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      logger.error('Sign in error', { 
        error: error.message,
        code: error.code,
        status: error.status,
        statusText: error.statusText,
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      });
      return { user: null, session: null, error };
    }
  },

  // Sign out
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      logger.info('User signed out');
      return { error: null };
    } catch (error) {
      logger.error('Sign out error', { 
        error: error.message,
        code: error.code,
        status: error.status,
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 10).join('\n'),
        } : error,
      });
      return { error };
    }
  },

  // Get current session
  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { session, error: null };
    } catch (error) {
      return { session: null, error };
    }
  },

  // Get current user
  getCurrentUser() {
    return supabase.auth.getUser();
  },

  // Listen to auth state changes
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

