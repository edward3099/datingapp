import supabase from '../config/supabase';
import { logger } from '../utils/logger';

export const messageService = {
  // Get conversation by match ID
  async getConversation(matchId) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('match_id', matchId)
        .single();

      if (error) throw error;

      let participants = [];
      try {
        const { data: participantRows, error: participantsError } = await supabase
          .from('conversation_participants')
          .select('*')
          .eq('conversation_id', data.id);
        if (participantsError) throw participantsError;
        participants = participantRows || [];
      } catch (participantsError) {
        logger.warn('Conversation participants fetch error', {
          error: participantsError?.message || String(participantsError),
          stack: participantsError?.stack,
          conversationId: data?.id,
        });
      }

      return { conversation: { ...data, participants }, error: null };
    } catch (error) {
      logger.error('Get conversation error', { 
        error: error.message,
        code: error.code,
        hint: error.hint,
        matchId,
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 10).join('\n'),
        } : error,
      });
      return { conversation: null, error };
    }
  },

  // Get or create conversation
  async getOrCreateConversation(matchId) {
    if (matchId === undefined || matchId === null) {
      const error = new Error('matchId is required to get or create a conversation');
      logger.error('Get or create conversation error', { error: error.message, matchId });
      return { conversation: null, error };
    }

    const numericMatchId =
      typeof matchId === 'string' && /^\d+$/.test(matchId) ? Number(matchId) : matchId;

    try {
      let { data: conversation, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('match_id', numericMatchId)
        .single();

      if (error && error.code === 'PGRST116') {
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert({ match_id: numericMatchId })
          .select()
          .single();

        if (createError) throw createError;
        conversation = newConversation;
      } else if (error) {
        throw error;
      }

      let participants = [];
      if (conversation?.id) {
        try {
          const { data: participantRows, error: participantsError } = await supabase
            .from('conversation_participants')
            .select('*')
            .eq('conversation_id', conversation.id);
          if (participantsError) throw participantsError;
          participants = participantRows || [];
        } catch (participantsError) {
          logger.warn('Conversation participants fetch error', {
            error: participantsError?.message || String(participantsError),
            stack: participantsError?.stack,
            conversationId: conversation?.id,
          });
        }
      }

      return { conversation: conversation ? { ...conversation, participants } : null, error: null };
    } catch (error) {
      logger.error('Get or create conversation error', { 
        error: error.message,
        code: error.code,
        hint: error.hint,
        matchId,
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 10).join('\n'),
        } : error,
      });
      return { conversation: null, error };
    }
  },

  // Get messages for a conversation
  async getMessages(conversationId, limit = 50, offset = 0) {
    try {
      // Try RPC function first
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_conversation_messages', {
        p_conversation_id: conversationId,
        p_limit: limit,
        p_offset: offset,
      });

      if (!rpcError && rpcData) {
        return { messages: rpcData, error: null };
      }

      // Fallback: Direct query
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { messages: data || [], error: null };
    } catch (error) {
      logger.error('Get messages error', { 
        error: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details,
        conversationId,
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 10).join('\n'),
        } : error,
      });
      return { messages: [], error };
    }
  },

  // Send a message
  async sendMessage(conversationId, content, messageType = 'text', attachments = null) {
    if (conversationId === undefined || conversationId === null) {
      const error = new Error('conversationId is required to send a message');
      logger.error('Send message error', { error: error.message, conversationId });
      return { message: null, error };
    }

    const normalizedConversationId =
      typeof conversationId === 'string' && /^\d+$/.test(conversationId)
        ? Number(conversationId)
        : conversationId;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: normalizedConversationId,
          sender_id: user.id,
          content,
          message_type: messageType,
          attachments,
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Message sent', { conversationId: normalizedConversationId, messageId: data.id });

      // Trigger push notification via Edge Function
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: user.id,
            title: 'New message',
            body: content,
            data: { conversation_id: conversationId, message_id: data.id },
          },
        });
      } catch (notifError) {
        // Non-critical, just log
        logger.warn('Push notification error', { error: notifError.message });
      }

      return { message: data, error: null };
    } catch (error) {
      logger.error('Send message error', { 
        error: error.message,
        code: error.code,
        hint: error.hint,
        conversationId: normalizedConversationId ?? conversationId,
        userId: user?.id,
        messageType,
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 10).join('\n'),
        } : error,
      });
      return { message: null, error };
    }
  },

  // Mark conversation as read
  async markAsRead(conversationId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('mark_conversation_read', {
        p_conversation_id: conversationId,
        p_user_id: user.id,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      logger.error('Mark as read error', { 
        error: error.message,
        code: error.code,
        hint: error.hint,
        conversationId,
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

  // Get unread message count
  async getUnreadCount(conversationId = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Try RPC function first
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_unread_message_count', {
        p_user_id: user.id,
      });

      if (!rpcError && rpcData !== null && rpcData !== undefined) {
        return { count: rpcData, error: null };
      }

      // Fallback: Count unread messages manually
      let query = supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .neq('sender_id', user.id)
        .is('read_at', null);

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      } else {
        // Get all conversations user is part of
        const { data: conversations } = await supabase
          .from('conversations')
          .select('id')
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

        if (conversations && conversations.length > 0) {
          const convIds = conversations.map((c) => c.id);
          query = query.in('conversation_id', convIds);
        } else {
          return { count: 0, error: null };
        }
      }

      const { count, error } = await query;

      if (error) throw error;
      return { count: count || 0, error: null };
    } catch (error) {
      logger.error('Get unread count error', { 
        error: error.message,
        code: error.code,
        hint: error.hint,
        conversationId,
        userId: user?.id,
        originalError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 10).join('\n'),
        } : error,
      });
      return { count: 0, error };
    }
  },

  // Subscribe to new messages in a conversation (Realtime)
  subscribeToMessages(conversationId, callback) {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
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

  // Subscribe to all user's conversations (Realtime)
  subscribeToConversations(callback) {
    const { data: { user } } = supabase.auth.getUser();
    if (!user) return null;

    const channel = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

