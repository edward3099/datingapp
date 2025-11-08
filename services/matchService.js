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
  subscribeToMatches(callback) {
    const { data: { user } } = supabase.auth.getUser();
    if (!user) return null;

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
          callback(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

