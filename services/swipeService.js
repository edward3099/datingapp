import supabase from '../config/supabase';
import { logger } from '../utils/logger';

export const swipeService = {
  // Record a swipe action
  async swipe(targetId, direction) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check rate limit
      const { data: rateLimit } = await supabase.rpc('check_rate_limit', {
        p_user_id: user.id,
        p_action_type: 'swipe',
        p_max_actions: 100,
        p_window_minutes: 60,
      });

      if (!rateLimit) {
        return { error: { message: 'Rate limit exceeded. Please slow down.' } };
      }

      const { data, error } = await supabase
        .from('swipes')
        .insert({
          swiper_id: user.id,
          target_id: targetId,
          direction: direction, // 'like', 'pass', or 'super'
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Swipe recorded', { direction, targetId });

      // Check if it's a match (check if target also liked this user)
      if (direction === 'like') {
        // Check if target user has already liked this user
        const { data: existingSwipe } = await supabase
          .from('swipes')
          .select('*')
          .eq('swiper_id', targetId)
          .eq('target_id', user.id)
          .eq('direction', 'like')
          .maybeSingle();

        if (existingSwipe) {
          // Create match
          const { data: matchData, error: matchError } = await supabase
            .from('matches')
            .insert({
              user_a: user.id < targetId ? user.id : targetId,
              user_b: user.id < targetId ? targetId : user.id,
            })
            .select()
            .single();

          if (!matchError && matchData) {
            return { swipe: data, isMatch: true, match: matchData, error: null };
          }
        }
      }

      return { swipe: data, isMatch: false, match: null, error: null };
    } catch (error) {
      logger.error('Swipe error', { 
        error: error.message,
        code: error.code,
        hint: error.hint,
        targetId,
        direction,
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 10).join('\n'),
        } : error,
      });
      return { swipe: null, isMatch: false, match: null, error };
    }
  },

  // Get swipe history (optional, for undo feature)
  async getSwipeHistory(limit = 50) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('swipes')
        .select('*, target:target_id(*)')
        .eq('swiper_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { swipes: data || [], error: null };
    } catch (error) {
      logger.error('Get swipe history error', { 
        error: error.message,
        code: error.code,
        hint: error.hint,
        userId: user?.id,
        limit,
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 10).join('\n'),
        } : error,
      });
      return { swipes: [], error };
    }
  },
};

