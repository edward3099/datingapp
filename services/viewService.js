import supabase from '../config/supabase';
import { logger } from '../utils/logger';

export const viewService = {
  // Track when a user views a profile
  async trackProfileView(viewedProfileId, options = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (user.id === viewedProfileId) {
        // Don't track self-views
        return { success: false, error: null };
      }

      const viewData = {
        viewer_id: user.id,
        viewed_id: viewedProfileId,
        view_duration: options.duration || null,
        source: options.source || 'swipe', // 'swipe', 'profile_detail', 'search'
      };

      const { data, error } = await supabase
        .from('profile_views')
        .insert(viewData)
        .select()
        .single();

      if (error) {
        // Ignore duplicate errors (if unique constraint exists)
        if (error.code === '23505') {
          logger.info('Profile view already tracked', { viewedProfileId });
          return { success: true, error: null };
        }
        throw error;
      }

      logger.info('Profile view tracked', { viewedProfileId, viewId: data.id });
      return { success: true, error: null };
    } catch (error) {
      logger.error('Track profile view error', {
        error: error?.message || String(error),
        code: error?.code,
        viewedProfileId,
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5).join('\n'),
        } : error,
      });
      return { success: false, error };
    }
  },

  // Get best curiosity notification for user
  async getBestCuriosityNotification(timeSlot = 'peak') {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('get_best_curiosity_notification', {
        p_user_id: user.id,
        p_time_slot: timeSlot,
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        return { notification: null, error: null };
      }

      return { notification: data[0], error: null };
    } catch (error) {
      logger.error('Get curiosity notification error', {
        error: error?.message || String(error),
        code: error?.code,
        timeSlot,
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
        } : error,
      });
      return { notification: null, error };
    }
  },

  // Mark notification as sent (update daily limit)
  async markNotificationSent(notificationType) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0];

      // Get current count
      const { data: existing } = await supabase
        .from('notification_daily_limits')
        .select('addictive_notifications_sent')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      const newCount = (existing?.addictive_notifications_sent || 0) + 1;

      // Upsert daily limit record
      const { data, error } = await supabase
        .from('notification_daily_limits')
        .upsert({
          user_id: user.id,
          date: today,
          addictive_notifications_sent: newCount,
          last_addictive_notification_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,date',
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Notification marked as sent', {
        notificationType,
        count: data.addictive_notifications_sent,
      });

      return { success: true, error: null };
    } catch (error) {
      logger.error('Mark notification sent error', {
        error: error?.message || String(error),
        notificationType,
      });
      return { success: false, error };
    }
  },

  // Get profile view stats for a user
  async getViewStats() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get views in last 24 hours
      const { data: recentViews, error: recentError } = await supabase
        .from('profile_views')
        .select('id')
        .eq('viewed_id', user.id)
        .gte('viewed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (recentError) throw recentError;

      // Get views today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: todayViews, error: todayError } = await supabase
        .from('profile_views')
        .select('id')
        .eq('viewed_id', user.id)
        .gte('viewed_at', todayStart.toISOString());

      if (todayError) throw todayError;

      return {
        viewsLast24Hours: recentViews?.length || 0,
        viewsToday: todayViews?.length || 0,
        error: null,
      };
    } catch (error) {
      logger.error('Get view stats error', {
        error: error?.message || String(error),
      });
      return { viewsLast24Hours: 0, viewsToday: 0, error };
    }
  },
};

