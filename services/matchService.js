import supabase from '../config/supabase';
import { logger } from '../utils/logger';

export const matchService = {
  // Get all matches for current user
  async getMatches() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Try RPC function, fallback to basic query
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_matches_with_last_message', {
        p_user_id: user.id,
      });

      if (!rpcError && rpcData) {
        return { matches: rpcData, error: null };
      }

      // Fallback: Get matches manually
      const { data: matches, error } = await supabase
        .from('matches')
        .select('*, user_a_profile:user_a(*), user_b_profile:user_b(*)')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get last messages and transform
      const matchesWithMessages = await Promise.all(
        (matches || []).map(async (match) => {
          const convId = match.conversation_id;
          let lastMessage = null;

          if (convId) {
            const { data: messages } = await supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', convId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            lastMessage = messages;
          }

          const otherUser = match.user_a === user.id ? match.user_b_profile : match.user_a_profile;

          return {
            ...match,
            user_a_id: match.user_a,
            user_b_id: match.user_b,
            user_a: match.user_a_profile,
            user_b: match.user_b_profile,
            last_message: lastMessage,
            otherUser,
          };
        })
      );

      return { matches: matchesWithMessages, error: null };
    } catch (error) {
      logger.error('Get matches error', { 
        error: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details,
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 10).join('\n'),
        } : error,
      });
      return { matches: [], error };
    }
  },

  // Get users who liked the current user (inbound likes)
  async getInboundLikes(limit = 40) {
    let userId = null;
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error('Not authenticated');
      userId = user.id;

      const { data, error } = await supabase
        .from('swipes')
        .select(
          `
            id,
            swiper_id,
            target_id,
            created_at,
            direction,
            swiper_profile:profiles!swipes_swiper_id_fkey (
              id,
              display_name,
              first_name,
              avatar_url,
              age,
              location,
              bio,
              tags
            )
          `
        )
        .eq('target_id', user.id)
        .eq('direction', 'like')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const seen = new Set();
      const likes = [];

      (data || []).forEach((entry) => {
        const likerId = entry?.swiper_id;
        if (!likerId || seen.has(likerId)) return;
        seen.add(likerId);

        const profile = { ...(entry?.swiper_profile || {}) };
        if (!profile.id && likerId) {
          profile.id = likerId;
        }
        likes.push({
          id: entry?.id ?? `${likerId}-${entry?.created_at}`,
          likerId,
          created_at: entry?.created_at,
          profile: {
            id: profile?.id || likerId,
            display_name: profile?.display_name || null,
            first_name: profile?.first_name || null,
            avatar_url: profile?.avatar_url || null,
            age: profile?.age ?? null,
            location: profile?.location || null,
            bio: profile?.bio || null,
            tags: profile?.tags || [],
          },
        });
      });

      return { likes, error: null };
    } catch (error) {
      logger.error('Get inbound likes error', {
        error: error?.message || String(error),
        code: error?.code,
        hint: error?.hint,
        userId,
        limit,
        originalError:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack?.split('\n').slice(0, 10).join('\n'),
              }
            : error,
      });
      return { likes: [], error };
    }
  },

  // Get match details
  async getMatch(matchId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .single();

      if (error) throw error;

      // Get other user's profile
      const otherUserId = data.user_a === user.id ? data.user_b : data.user_a;
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherUserId)
        .single();

      return { match: { ...data, otherUser: profile }, error: null };
    } catch (error) {
      logger.error('Get match error', { 
        error: error.message,
        code: error.code,
        hint: error.hint,
        matchId,
        userId: user?.id,
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 10).join('\n'),
        } : error,
      });
      return { match: null, error };
    }
  },

  // Unmatch (delete match)
  async unmatch(matchId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Verify user is part of match
      const { data: match } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .single();

      if (!match) throw new Error('Match not found');

      // Update match status to 'unmatched'
      const { error } = await supabase
        .from('matches')
        .update({ status: 'unmatched' })
        .eq('id', matchId);

      if (error) throw error;
      logger.info('Match unmatched', { matchId });
      return { error: null };
    } catch (error) {
      logger.error('Unmatch error', { 
        error: error.message,
        code: error.code,
        hint: error.hint,
        matchId,
        userId: user?.id,
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 10).join('\n'),
        } : error,
      });
      return { error };
    }
  },

  // Listen to new matches (Realtime)
  async subscribeToMatches(callback) {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;

      const user = data?.user;
      if (!user) {
        logger.warn('subscribeToMatches called without authenticated user');
        return null;
      }

      const channel = supabase
        .channel('matches')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'matches',
            filter: `or(user_a.eq.${user.id},user_b.eq.${user.id})`,
          },
          (payload) => {
            try {
              callback(payload.new);
            } catch (callbackError) {
              logger.error('Match subscription callback error', {
                error: callbackError?.message || String(callbackError),
                stack: callbackError?.stack,
              });
            }
          }
        )
        .subscribe((status) => {
          logger.debug?.('Match subscription status', { status });
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      logger.error('Failed to subscribe to matches', {
        error: error?.message || String(error),
        stack: error?.stack,
      });
      return null;
    }
  },
};

