import supabase from '../config/supabase';
import { logger } from '../utils/logger';

export const notificationService = {
  // Send push notification for a notification record
  async sendPushNotification(notificationId) {
    try {
      // Get the notification
      const { data: notification, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', notificationId)
        .single();

      if (fetchError) throw fetchError;
      if (!notification) throw new Error('Notification not found');

      // Get user's devices (push tokens)
      const { data: devices, error: devicesError } = await supabase
        .from('devices')
        .select('expo_push_token, platform')
        .eq('user_id', notification.user_id)
        .not('expo_push_token', 'is', null);

      if (devicesError) throw devicesError;

      if (!devices || devices.length === 0) {
        logger.info('No devices found for user', { userId: notification.user_id });
        return { success: true, sent: false, error: null };
      }

      // Send push notification via Edge Function
      const results = await Promise.allSettled(
        devices.map((device) =>
          supabase.functions.invoke('send-push-notification', {
            body: {
              user_id: notification.user_id,
              title: notification.title,
              body: notification.body,
              data: notification.data || {},
              expo_push_token: device.expo_push_token,
            },
          })
        )
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      logger.info('Push notification sent', {
        notificationId,
        userId: notification.user_id,
        devicesCount: devices.length,
        successful,
        failed,
      });

      return { success: true, sent: successful > 0, error: null };
    } catch (error) {
      logger.error('Send push notification error', {
        error: error?.message || String(error),
        notificationId,
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5).join('\n'),
        } : error,
      });
      return { success: false, sent: false, error };
    }
  },

  // Process pending notifications and send push notifications
  async processPendingNotifications(limit = 50) {
    try {
      // Get unprocessed notifications (created in last hour, not read, channel is push)
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('channel', 'push')
        .is('read_at', null)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      if (!notifications || notifications.length === 0) {
        return { processed: 0, sent: 0, error: null };
      }

      // Send push notifications for each
      const results = await Promise.allSettled(
        notifications.map((notif) => this.sendPushNotification(notif.id))
      );

      const successful = results.filter((r) => r.status === 'fulfilled' && r.value.sent).length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      logger.info('Processed pending notifications', {
        total: notifications.length,
        successful,
        failed,
      });

      return { processed: notifications.length, sent: successful, error: null };
    } catch (error) {
      logger.error('Process pending notifications error', {
        error: error?.message || String(error),
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
        } : error,
      });
      return { processed: 0, sent: 0, error };
    }
  },

  // Get unread notifications for current user
  async getUnreadNotifications() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return { notifications: data || [], error: null };
    } catch (error) {
      logger.error('Get unread notifications error', {
        error: error?.message || String(error),
      });
      return { notifications: [], error };
    }
  },

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return { notification: data, error: null };
    } catch (error) {
      logger.error('Mark notification as read error', {
        error: error?.message || String(error),
        notificationId,
      });
      return { notification: null, error };
    }
  },
};

