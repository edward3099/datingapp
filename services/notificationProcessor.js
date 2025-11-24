import supabase from '../config/supabase';
import { logger } from '../utils/logger';

/**
 * Real-time notification processor
 * Listens for new notifications and sends push notifications via Edge Function
 */
export class NotificationProcessor {
  constructor() {
    this.subscription = null;
    this.isProcessing = false;
  }

  // Start listening for new notifications
  start() {
    if (this.subscription) {
      logger.warn('Notification processor already started');
      return;
    }

    logger.info('Starting notification processor');

    this.subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: 'channel=eq.push',
        },
        async (payload) => {
          const notification = payload.new;
          logger.info('New notification received', {
            notificationId: notification.id,
            userId: notification.user_id,
            type: notification.data?.type,
          });

          // Process notification (send push)
          await this.processNotification(notification);
        }
      )
      .subscribe((status) => {
        logger.info('Notification subscription status', { status });
      });
  }

  // Stop listening
  stop() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
      logger.info('Notification processor stopped');
    }
  }

  // Process a single notification and send push
  async processNotification(notification) {
    if (this.isProcessing) {
      logger.warn('Already processing notification, skipping');
      return;
    }

    this.isProcessing = true;

    try {
      // Call Edge Function to send push notification
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: notification.user_id,
          title: notification.title,
          body: notification.body,
          data: {
            ...(notification.data || {}),
            notification_id: notification.id,
          },
        },
      });

      if (error) {
        logger.error('Failed to send push notification', {
          error: error.message,
          notificationId: notification.id,
        });
      } else {
        logger.info('Push notification sent', {
          notificationId: notification.id,
          userId: notification.user_id,
          result: data,
        });
      }
    } catch (error) {
      logger.error('Error processing notification', {
        error: error?.message || String(error),
        notificationId: notification.id,
      });
    } finally {
      this.isProcessing = false;
    }
  }

  // Process pending notifications (for initial load or catch-up)
  async processPendingNotifications() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get pending notifications for current user
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('channel', 'push')
        .is('read_at', null)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) throw error;

      if (!notifications || notifications.length === 0) {
        return { processed: 0 };
      }

      // Process each notification
      for (const notification of notifications) {
        await this.processNotification(notification);
        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return { processed: notifications.length };
    } catch (error) {
      logger.error('Error processing pending notifications', {
        error: error?.message || String(error),
      });
      return { processed: 0, error };
    }
  }
}

// Singleton instance
let notificationProcessorInstance = null;

export const getNotificationProcessor = () => {
  if (!notificationProcessorInstance) {
    notificationProcessorInstance = new NotificationProcessor();
  }
  return notificationProcessorInstance;
};

