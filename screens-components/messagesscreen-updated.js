import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { messageService } from '../services/messageService';
import { logger } from '../utils/logger';
import TopNavBar from '../components/TopNavBar';

export default function MessagesScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuth();
  const { matchId, conversationId, otherUser } = route.params || {};

  const [activeConversationId, setActiveConversationId] = useState(conversationId || null);
  const subscriptionRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const ensureConversation = async () => {
    let convId = activeConversationId || conversationId;

    if (convId) {
      return convId;
    }

    if (!matchId) {
      return null;
    }

    const { conversation, error: convError } = await messageService.getOrCreateConversation(matchId);
    if (convError) throw convError;

    convId = conversation?.id || null;
    if (convId && convId !== activeConversationId) {
      setActiveConversationId(convId);
    }
    return convId;
  };

  useEffect(() => {
    if (conversationId && conversationId !== activeConversationId) {
      setActiveConversationId(conversationId);
    }
  }, [conversationId, activeConversationId]);


  useEffect(() => {
    if (!isAuthenticated) {
      return () => {};
    }

    let isMounted = true;

    const initialize = async () => {
      try {
        const convId = await ensureConversation();

        if (!isMounted) return;

        if (!convId) {
          setMessages([]);
          setLoading(false);
          return;
        }

        await loadMessages(convId);
        if (!isMounted) return;

        await markAsRead(convId);

        subscribeToMessages(convId);
      } catch (error) {
        logger.error('Failed to initialize messages screen', {
          error: error?.message || String(error),
          stack: error?.stack,
          conversationId: activeConversationId || conversationId,
          matchId,
        });
        setLoading(false);
      }
    };

    initialize();

    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        try {
          subscriptionRef.current();
        } catch (unsubscribeError) {
          logger.error('Error unsubscribing from messages', {
            error: unsubscribeError?.message || String(unsubscribeError),
            stack: unsubscribeError?.stack,
          });
        }
        subscriptionRef.current = null;
      }
    };
  }, [isAuthenticated, matchId, activeConversationId]);

  const loadMessages = async (convId) => {
    setLoading(true);
    try {
      const { messages: msgList, error } = await messageService.getMessages(convId, 50);
      if (error) throw error;
      setMessages((msgList || []).reverse()); // Reverse to show newest at bottom
    } catch (error) {
      logger.error('Load messages error', {
        error: error?.message || String(error),
        stack: error?.stack,
        conversationId: convId,
        matchId,
        userId: user?.id,
        errorDetails: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = (convId) => {
    if (!convId) return;

    try {
      const unsubscribe = messageService.subscribeToMessages(convId, (newMessage) => {
        try {
          setMessages((prev) => [...prev, newMessage]);
          setTimeout(() => {
            try {
              listRef.current?.scrollToEnd({ animated: true });
            } catch (scrollError) {
              logger.error('Error scrolling to end', {
                error: scrollError?.message || String(scrollError),
              });
            }
          }, 100);
          markAsRead(convId).catch((error) => {
            logger.error('Failed to mark as read on new message', {
              error: error?.message || String(error),
              conversationId: convId,
            });
          });
        } catch (error) {
          logger.error('Error in message subscription callback', {
            error: error?.message || String(error),
            stack: error?.stack,
            conversationId: convId,
          });
        }
      });

      if (subscriptionRef.current) {
        try {
          subscriptionRef.current();
        } catch (unsubscribeError) {
          logger.error('Error unsubscribing previous listener', {
            error: unsubscribeError?.message || String(unsubscribeError),
            stack: unsubscribeError?.stack,
          });
        }
      }

      subscriptionRef.current = unsubscribe;
    } catch (error) {
      logger.error('Error setting up message subscription', {
        error: error?.message || String(error),
        stack: error?.stack,
        conversationId: convId,
      });
    }
  };

  const markAsRead = async (convId = activeConversationId || conversationId) => {
    if (!convId) return;
    try {
      await messageService.markAsRead(convId);
    } catch (error) {
      logger.error('Mark as read error', {
        error: error?.message || String(error),
        stack: error?.stack,
        conversationId: convId,
        userId: user?.id,
      });
    }
  };

  const handleSend = async () => {
    const convId = activeConversationId || conversationId;
    if (text.trim() === '' || sending || !convId) return;

    setSending(true);
    try {
      const { message, error } = await messageService.sendMessage(
        convId,
        text.trim(),
        'text'
      );

      if (error) throw error;

      setMessages((prev) => [...prev, message]);
      setText('');
      setTimeout(() => {
        try {
          listRef.current?.scrollToEnd({ animated: true });
        } catch (scrollError) {
          logger.error('Error scrolling after send', {
            error: scrollError?.message || String(scrollError),
          });
        }
      }, 100);
    } catch (error) {
      logger.error('Send message error', {
        error: error?.message || String(error),
        stack: error?.stack,
        conversationId: convId,
        userId: user?.id,
        messageText: text.trim().substring(0, 50), // Log first 50 chars
        errorDetails: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      });
      // Could show an alert here if needed
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.sender_id === user?.id;
    return (
      <View
        style={[
          styles.messageContainer,
          isMe ? styles.messageRight : styles.messageLeft,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMe ? styles.messageBubbleMe : styles.messageBubbleOther,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMe ? styles.messageTextMe : styles.messageTextOther,
            ]}
          >
            {item.content}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isMe ? styles.messageTimeMe : styles.messageTimeOther,
            ]}
          >
            {new Date(item.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#E8F6FF', '#F3FAFF']} style={StyleSheet.absoluteFill} />
        <TopNavBar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5BC0F8" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <LinearGradient colors={['#E8F6FF', '#F3FAFF']} style={StyleSheet.absoluteFill} />
      <TopNavBar />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Image
            source={
              otherUser?.avatar_url
                ? { uri: otherUser.avatar_url }
                : require('./assets/angel.png')
            }
            style={styles.headerAvatar}
          />
          <Text style={styles.headerName}>
            {otherUser?.display_name || otherUser?.first_name || 'Unknown'}
          </Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          multiline
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendButton, sending && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={sending || text.trim() === ''}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#5BC0F8', fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  backButton: { fontSize: 18, color: '#5BC0F8', fontWeight: '600', marginRight: 12 },
  headerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  headerName: { fontSize: 18, fontWeight: '700', color: '#063970' },
  list: { padding: 16, paddingBottom: 80 },
  messageContainer: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  messageLeft: { justifyContent: 'flex-start' },
  messageRight: { justifyContent: 'flex-end' },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  messageBubbleMe: {
    backgroundColor: '#5BC0F8',
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 16, marginBottom: 4 },
  messageTextMe: { color: '#fff' },
  messageTextOther: { color: '#063970' },
  messageTime: { fontSize: 11, opacity: 0.7 },
  messageTimeMe: { color: '#fff' },
  messageTimeOther: { color: '#063970' },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#5BC0F8',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

