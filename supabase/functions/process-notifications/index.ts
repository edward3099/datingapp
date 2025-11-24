import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get pending push notifications
    const { data: notifications, error: fetchError } = await supabase
      .rpc('get_pending_push_notifications', { p_limit: 50 });

    if (fetchError) {
      console.error('Error fetching notifications:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch notifications' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!notifications || notifications.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No pending notifications',
        processed: 0 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Process each notification
    const results = await Promise.allSettled(
      notifications.map(async (notif) => {
        // Get user's devices
        const { data: devices, error: devicesError } = await supabase
          .from('devices')
          .select('expo_push_token, platform')
          .eq('user_id', notif.user_id)
          .not('expo_push_token', 'is', null);

        if (devicesError || !devices || devices.length === 0) {
          return { notificationId: notif.id, success: false, reason: 'No devices' };
        }

        // Send push notifications via Expo
        const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
        const messages = devices.map((device) => ({
          to: device.expo_push_token,
          sound: 'default',
          title: notif.title,
          body: notif.body,
          data: notif.data || {},
          channelId: 'default',
        }));

        const response = await fetch(expoPushUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messages),
        });

        const result = await response.json();

        // Mark notification as processed (optional - you might want to keep it unread)
        // await supabase
        //   .from('notifications')
        //   .update({ read_at: new Date().toISOString() })
        //   .eq('id', notif.id);

        return { 
          notificationId: notif.id, 
          success: true, 
          sent: messages.length,
          expoResponse: result 
        };
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return new Response(JSON.stringify({
      message: 'Notifications processed',
      total: notifications.length,
      successful,
      failed,
      results: results.map((r) => r.status === 'fulfilled' ? r.value : { error: r.reason }),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing notifications:', error);
    return new Response(JSON.stringify({
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

