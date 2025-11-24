import supabase from '../config/supabase';
import { logger } from '../utils/logger';

export const swipeService = {
  // Record a swipe action
  async swipe(targetId, direction) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const swipePayload = {
        swiper_id: user.id,
        target_id: targetId,
        direction, // 'like', 'pass', or 'super'
      };

      let swipeRecord = null;
      let updatedExisting = false;

      const insertResult = await supabase
        .from('swipes')
        .insert(swipePayload)
        .select()
        .single();

      if (insertResult.error) {
        if (insertResult.error.code === '23505') {
          const { data: updatedSwipe, error: updateError } = await supabase
            .from('swipes')
            .update(swipePayload)
            .eq('swiper_id', user.id)
            .eq('target_id', targetId)
            .select()
            .maybeSingle();

          if (updateError && updateError.code !== 'PGRST116') {
            throw updateError;
          }

          if (!updatedSwipe) {
            const { data: existingSwipe, error: existingError } = await supabase
              .from('swipes')
              .select('*')
              .eq('swiper_id', user.id)
              .eq('target_id', targetId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (existingError) throw existingError;
            swipeRecord = existingSwipe;
          } else {
            swipeRecord = updatedSwipe;
          }

          updatedExisting = true;
        } else {
          throw insertResult.error;
        }
      } else {
        swipeRecord = insertResult.data;
      }

      logger.info('Swipe recorded', {
        direction,
        targetId,
        updated: updatedExisting,
        swipeId: swipeRecord?.id ?? null,
      });

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
          const userLow = user.id < targetId ? user.id : targetId;
          const userHigh = user.id < targetId ? targetId : user.id;
          let matchPayload = null;

          const { data: matchData, error: matchError } = await supabase
            .from('matches')
            .insert({
              user_a: userLow,
              user_b: userHigh,
            })
            .select()
            .single();

          if (!matchError && matchData) {
            matchPayload = matchData;
          } else if (matchError && matchError.code === '23505') {
            const { data: existingMatch, error: fetchMatchError } = await supabase
              .from('matches')
              .select('*')
              .eq('user_a', userLow)
              .eq('user_b', userHigh)
              .maybeSingle();

            if (!fetchMatchError && existingMatch) {
              matchPayload = existingMatch;
            } else {
              logger.warn('Duplicate match detected but fetch failed', {
                fetchMatchError: fetchMatchError?.message,
                userLow,
                userHigh,
              });
            }
          } else if (matchError) {
            logger.error('Match creation error', {
              error: matchError.message,
              code: matchError.code,
              hint: matchError.hint,
              userLow,
              userHigh,
            });
          }

          if (!matchPayload) {
            matchPayload = {
              id: null,
              user_a: userLow,
              user_b: userHigh,
              created_at: new Date().toISOString(),
            };
          }

          logger.info('Match confirmed', {
            matchId: matchPayload?.id ?? null,
            userLow,
            userHigh,
          });

          return { swipe: swipeRecord, isMatch: true, match: matchPayload, error: null };
        }
      }

      return { swipe: swipeRecord, isMatch: false, match: null, error: null };
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

