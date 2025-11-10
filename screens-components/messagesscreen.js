import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Animated,
  Image,
  Dimensions,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../contexts/AuthContext';
import { matchService } from '../services/matchService';
import { messageService } from '../services/messageService';
import { logger } from '../utils/logger';
import TopNavBar from '../components/TopNavBar';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const HEADER_DURATION = 600;
const CHAT_IN_DURATION = 450;
const CHAT_OUT_DURATION = 320;
const CHAT_OVERLAY_TOP_OFFSET = Platform.OS === 'ios' ? 110 : 86;
const CHAT_AVAILABLE_HEIGHT = Math.max(320, SCREEN_H - CHAT_OVERLAY_TOP_OFFSET);
const CHAT_DISMISS_THRESHOLD = Math.max(160, CHAT_AVAILABLE_HEIGHT * 0.22);

const PLACEHOLDER_MESSAGE = 'Say hi and break the ice!';

const getDisplayName = (match) =>
  match?.otherUser?.display_name ||
  match?.otherUser?.first_name ||
  match?.other_user_name ||
  match?.otherUser?.name ||
  'Match';

const getAvatar = (match) =>
  match?.otherUser?.avatar_url ||
  match?.other_user_avatar ||
  match?.otherUser?.avatar ||
  null;

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const now = Date.now();
  const target = new Date(timestamp).getTime();
  if (Number.isNaN(target)) return '';

  const diffMs = now - target;
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(timestamp).toLocaleDateString();
};

const createMessageKeyFactory = () => {
  let counter = 0;
  return (message) => {
    if (message?.id !== undefined && message?.id !== null) {
      return String(message.id);
    }
    if (message?.clientKey) {
      return String(message.clientKey);
    }
    if (message?.created_at) {
      return String(message.created_at);
    }
    counter += 1;
    return `msg-local-${counter}`;
  };
};

const nextMessageKey = createMessageKeyFactory();

const withMessageKey = (message) => {
  if (!message) return null;
  const clientKey = nextMessageKey(message);
  if (message.clientKey === clientKey) return message;
  return { ...message, clientKey };
};

export default function MessagesScreen() {
  const { isAuthenticated, user } = useAuth();
  const navigation = useNavigation();

  const headerAnim = useRef(new Animated.Value(0)).current;
  const chatAnim = useRef(new Animated.Value(0)).current;
  const screenLift = useRef(new Animated.Value(0)).current;
  const inputScale = useRef(new Animated.Value(1)).current;
  const sendPulse = useRef(new Animated.Value(0)).current;
  const chatAnimValueRef = useRef(0);

  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState(null);
  const [likes, setLikes] = useState([]);
  const [likesLoading, setLikesLoading] = useState(true);
  const [likesError, setLikesError] = useState(null);

  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const conversationIdRef = useRef(null);
  const subscriptionRef = useRef(null);
  const listRef = useRef(null);

  const sendScale = sendPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.25],
  });
  const liftScale = screenLift.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });
  const glowOpacity = screenLift.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0],
  });

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: HEADER_DURATION,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [headerAnim]);

  useEffect(() => {
    const id = chatAnim.addListener(({ value }) => {
      chatAnimValueRef.current = value;
    });
    return () => {
      chatAnim.removeListener(id);
    };
  }, [chatAnim]);

  const cleanupSubscription = useCallback(() => {
    if (subscriptionRef.current) {
      try {
        subscriptionRef.current();
      } catch (error) {
        logger.error('Error cleaning up message subscription', {
          error: error?.message || String(error),
          stack: error?.stack,
        });
      }
      subscriptionRef.current = null;
    }
  }, []);

  const loadMatches = useCallback(async () => {
    if (!isAuthenticated) return;

    setMatchesLoading(true);
    setMatchesError(null);
    try {
      const { matches: data, error } = await matchService.getMatches();
      if (error) throw error;
      const normalized = (data || []).map((match) => {
        const primaryId =
          match?.id ??
          match?.match_id ??
          match?.matchId ??
          (typeof match?.match === 'object' ? match.match.id : null);
        return { ...match, id: primaryId };
      });
      setMatches(normalized);
    } catch (error) {
      setMatchesError(error?.message || 'Unable to load matches');
      logger.error('Load matches error', {
        error: error?.message || String(error),
        stack: error?.stack,
        userId: user?.id,
      });
    } finally {
      setMatchesLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  const loadInboundLikes = useCallback(async () => {
    if (!isAuthenticated) {
      setLikes([]);
      setLikesLoading(false);
      return;
    }

    setLikesLoading(true);
    setLikesError(null);
    try {
      const { likes: data, error } = await matchService.getInboundLikes();
      if (error) throw error;
      setLikes(Array.isArray(data) ? data : []);
    } catch (error) {
      setLikesError(error?.message || 'Unable to load likes');
      logger.error('Load inbound likes error', {
        error: error?.message || String(error),
        stack: error?.stack,
        userId: user?.id,
      });
    } finally {
      setLikesLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    loadMatches();
    loadInboundLikes();
    return cleanupSubscription;
  }, [loadMatches, loadInboundLikes, cleanupSubscription]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let unsubscribeMatches = null;
    (async () => {
      try {
        unsubscribeMatches = await matchService.subscribeToMatches(() => {
          loadMatches().catch((error) => {
            logger.error('Realtime matches refresh error', {
              error: error?.message || String(error),
              stack: error?.stack,
            });
          });
          loadInboundLikes().catch((error) => {
            logger.error('Realtime likes refresh error', {
              error: error?.message || String(error),
              stack: error?.stack,
            });
          });
        });
      } catch (error) {
        logger.error('Subscribe to matches (inbox) error', {
          error: error?.message || String(error),
          stack: error?.stack,
        });
      }
    })();

    return () => {
      if (typeof unsubscribeMatches === 'function') {
        try {
          unsubscribeMatches();
        } catch (error) {
          logger.error('Unsubscribe matches (inbox) error', {
            error: error?.message || String(error),
            stack: error?.stack,
          });
        }
      }
    };
  }, [isAuthenticated, loadMatches, loadInboundLikes]);

  const ensureConversation = useCallback(async (thread) => {
    if (!thread) return null;
    if (thread.conversation_id) return thread.conversation_id;

    const matchId =
      thread.id ??
      thread.match_id ??
      thread.matchId ??
      (typeof thread.match === 'object' ? thread.match.id : null);

    if (!matchId) {
      logger.warn('Ensure conversation skipped: missing match id', { thread });
      return null;
    }

    try {
      const { conversation, error } = await messageService.getOrCreateConversation(matchId);
      if (error) throw error;
      const convId = conversation?.id || null;
      if (convId) {
        setMatches((prev) =>
          prev.map((match) =>
            (match.id ?? match.match_id) === matchId
              ? { ...match, id: match.id ?? matchId, conversation_id: convId }
              : match
          )
        );
      }
      return convId;
    } catch (error) {
      logger.error('Ensure conversation error', {
        error: error?.message || String(error),
        stack: error?.stack,
        matchId,
      });
      return null;
    }
  }, []);

  const markThreadAsRead = useCallback(async (thread, convId) => {
    if (!thread || !convId) return;
    try {
      await messageService.markAsRead(convId);
      setMatches((prev) =>
        prev.map((match) =>
          match.id === thread.id
            ? {
                ...match,
                unread_count: 0,
              }
            : match
        )
      );
    } catch (error) {
      logger.error('Mark thread as read error', {
        error: error?.message || String(error),
        stack: error?.stack,
        conversationId: convId,
      });
    }
  }, []);

  const subscribeToConversation = useCallback((convId, thread) => {
    if (!convId) return;

    cleanupSubscription();

    try {
      const unsubscribe = messageService.subscribeToMessages(convId, (newMessage) => {
        try {
          setMessages((prev) => {
            const normalized = withMessageKey(newMessage);
            if (!normalized) return prev;
            const existsIndex = prev.findIndex((msg) => msg.clientKey === normalized.clientKey);
            if (existsIndex >= 0) {
              const next = [...prev];
              next[existsIndex] = { ...prev[existsIndex], ...normalized };
              return next;
            }
            return [...prev, normalized];
          });
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

          setMatches((prev) =>
            prev.map((match) =>
              match.id === thread.id
                ? {
                    ...match,
                    last_message: newMessage,
                    last_message_content: newMessage?.content,
                    last_message_at: newMessage?.created_at,
                    unread_count:
                      newMessage?.sender_id === user?.id
                        ? 0
                        : (match.unread_count || 0) + 1,
                  }
                : match
            )
          );
        } catch (error) {
          logger.error('Conversation subscription callback error', {
            error: error?.message || String(error),
            stack: error?.stack,
            conversationId: convId,
          });
        }
      });

      subscriptionRef.current = unsubscribe;
    } catch (error) {
      logger.error('Subscribe to conversation error', {
        error: error?.message || String(error),
        stack: error?.stack,
        conversationId: convId,
      });
    }
  }, [cleanupSubscription, user?.id]);

  const openProfile = useCallback(
    (profile) => {
      if (!profile?.id) return;
      navigation.navigate('ProfileOfOtherPeople', { profile });
    },
    [navigation]
  );

  const loadConversation = useCallback(async (convId) => {
    if (!convId) {
      setMessages([]);
      return;
    }

    setLoadingThread(true);
    try {
      const { messages: data, error } = await messageService.getMessages(convId, 50);
      if (error) throw error;
      conversationIdRef.current = convId;
      const normalized = [];
      const seenKeys = new Set();
      (data || [])
        .reverse()
        .forEach((msg) => {
          const normal = withMessageKey(msg);
          if (!normal || seenKeys.has(normal.clientKey)) return;
          seenKeys.add(normal.clientKey);
          normalized.push(normal);
        });
      setMessages(normalized);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 0);
    } catch (error) {
      logger.error('Load conversation error', {
        error: error?.message || String(error),
        stack: error?.stack,
        conversationId: convId,
      });
    } finally {
      setLoadingThread(false);
    }
  }, []);

  const openChat = useCallback(
    async (thread) => {
      if (!thread) return;
      setSelectedThread(thread);
      setText('');
      screenLift.setValue(0);

      try {
        const convId = await ensureConversation(thread);
        await loadConversation(convId);
        await markThreadAsRead(thread, convId);
        subscribeToConversation(convId, thread);
      } finally {
        Animated.timing(chatAnim, {
          toValue: 1,
          duration: CHAT_IN_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
        Animated.timing(screenLift, {
      toValue: 1,
      duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      }
    },
    [
      chatAnim,
      ensureConversation,
      loadConversation,
      markThreadAsRead,
      screenLift,
      subscribeToConversation,
    ]
  );

  const closeChat = useCallback(() => {
    Animated.timing(chatAnim, {
      toValue: 0,
      duration: CHAT_OUT_DURATION,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      cleanupSubscription();
      conversationIdRef.current = null;
      setSelectedThread(null);
      setMessages([]);
      setText('');
    });
    Animated.timing(screenLift, {
      toValue: 0,
      duration: 300,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [chatAnim, cleanupSubscription, screenLift]);

  const chatPanResponder = useMemo(() => {
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!selectedThread) return false;
        const { dy, dx } = gestureState;
        return dy > 6 && Math.abs(dx) < 40;
      },
      onPanResponderGrant: () => {
        chatAnim.stopAnimation();
        screenLift.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        const { dy } = gestureState;
        if (dy <= 0) {
          chatAnim.setValue(Math.min(1, chatAnimValueRef.current - dy / CHAT_AVAILABLE_HEIGHT));
          screenLift.setValue(1);
          return;
        }
        const ratio = Math.min(1, dy / CHAT_AVAILABLE_HEIGHT);
        const nextValue = Math.max(0, 1 - ratio);
        chatAnim.setValue(nextValue);
        screenLift.setValue(Math.max(0, 1 - ratio * 0.7));
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dy, vy } = gestureState;
        const shouldClose = dy > CHAT_DISMISS_THRESHOLD || vy > 1.2;
        if (shouldClose) {
          closeChat();
        } else {
          Animated.spring(chatAnim, {
            toValue: 1,
            speed: 14,
            bounciness: 6,
            useNativeDriver: false,
          }).start();
          Animated.spring(screenLift, {
            toValue: 1,
            speed: 14,
            bounciness: 6,
            useNativeDriver: false,
          }).start();
        }
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: (_, gestureState) => {
        const { dy, vy } = gestureState;
        const shouldClose = dy > CHAT_DISMISS_THRESHOLD || vy > 1.2;
        if (shouldClose) {
          closeChat();
        } else {
          Animated.spring(chatAnim, {
            toValue: 1,
            speed: 14,
            bounciness: 6,
            useNativeDriver: false,
          }).start();
          Animated.spring(screenLift, {
            toValue: 1,
            speed: 14,
            bounciness: 6,
            useNativeDriver: false,
          }).start();
        }
      },
    });
  }, [chatAnim, closeChat, screenLift, selectedThread]);

  const handleSend = useCallback(async () => {
    if (sending || !selectedThread) return;

    const trimmed = text.trim();
    if (trimmed === '') return;

    let convId = conversationIdRef.current;
    logger.info?.('Chat handleSend invoked', {
      existingConversationId: convId,
      threadId: selectedThread?.id,
      textLength: trimmed.length,
    });
    if (!convId) {
      convId = await ensureConversation(selectedThread);
      if (!convId) {
        logger.warn('Handle send skipped: missing conversation id', {
          threadId: selectedThread?.id,
        });
        return;
      }
      conversationIdRef.current = convId;
    }

    setSending(true);
    Animated.sequence([
      Animated.timing(sendPulse, { toValue: 1, duration: 150, useNativeDriver: false }),
      Animated.timing(sendPulse, { toValue: 0, duration: 260, useNativeDriver: false }),
    ]).start();

    try {
      const { message, error } = await messageService.sendMessage(convId, trimmed, 'text');
      if (error) throw error;

      setMessages((prev) => {
        const normalized = withMessageKey(message);
        if (!normalized) return prev;
        const existsIndex = prev.findIndex((msg) => msg.clientKey === normalized.clientKey);
        if (existsIndex >= 0) {
          const next = [...prev];
          next[existsIndex] = { ...prev[existsIndex], ...normalized };
          return next;
        }
        return [...prev, normalized];
      });
      logger.info?.('Chat message appended', {
        conversationId: convId,
        messageId: message?.id,
      });
      setText('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

      setMatches((prev) =>
        prev.map((match) =>
          match.id === selectedThread.id
            ? {
                ...match,
                last_message: message,
                last_message_content: message?.content,
                last_message_at: message?.created_at,
                unread_count: 0,
              }
            : match
        )
      );
    } catch (error) {
      logger.error('Send message error', {
        error: error?.message || String(error),
        stack: error?.stack,
        conversationId: convId,
        messagePreview: trimmed.slice(0, 32),
      });
    } finally {
      setSending(false);
    }
  }, [ensureConversation, selectedThread, sendPulse, sending, text]);

  const handleInputFocus = useCallback(() => {
    Animated.spring(inputScale, {
      toValue: 0.97,
      useNativeDriver: false,
      speed: 12,
      bounciness: 6,
    }).start();
  }, [inputScale]);

  const handleInputBlur = useCallback(() => {
    Animated.spring(inputScale, {
      toValue: 1,
      useNativeDriver: false,
      speed: 12,
      bounciness: 6,
    }).start();
  }, [inputScale]);

  const matchCards = useMemo(
    () =>
      matches.map((match, index) => {
        const cardId =
          match.id ?? match.match_id ?? match.matchId ?? (typeof match.match === 'object' ? match.match.id : null);
        const safeId = cardId ?? `match-${index}`;
        return {
          id: String(safeId),
          name: getDisplayName(match),
          avatar: getAvatar(match),
          raw: match,
        };
      }),
    [matches]
  );

  const messageThreads = useMemo(() => {
    const threads = matches.map((match, index) => {
      const matchId =
        match.id ?? match.match_id ?? match.matchId ?? (typeof match.match === 'object' ? match.match.id : null);
      const safeId = matchId ?? `thread-${index}`;
      const name = getDisplayName(match);
      const avatar = getAvatar(match);
      const lastMessage = match.last_message?.content || match.last_message_content || PLACEHOLDER_MESSAGE;
      const lastMessageAt =
        match.last_message?.created_at || match.last_message_at || match.last_interaction_at || null;
      const unread = match.unread_count || 0;

      return {
        id: String(safeId),
        name,
        avatar,
        lastMessage,
        lastMessageAt,
        unread,
        raw: match,
      };
    });

    return threads.sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [matches]);

  const likesCards = useMemo(() => {
    const matchedIds = new Set(
      matches
        .map((match) => match?.otherUser?.id || match?.other_user_id || match?.other_user || match?.other_user_uuid)
        .filter(Boolean)
    );

    return (likes || [])
      .filter((like) => like?.profile?.id && !matchedIds.has(like.profile.id))
      .map((like) => {
        const profile = like.profile || {};
        const name = profile.display_name || profile.first_name || 'Someone';
        const avatar = profile.avatar_url || null;
        const location = profile.location || null;
        return {
          id: String(like.likerId || profile.id || like.id || `${profile.id ?? 'like'}-${like.created_at ?? ''}`),
          name,
          avatar,
          location,
          likedAt: like.created_at || null,
          profile,
        };
      });
  }, [likes, matches]);

  const combinedData = useMemo(() => {
    const items = [{ type: 'header' }, { type: 'likes' }, { type: 'matches' }];
    messageThreads.forEach((thread) => {
      items.push({ type: 'message', data: thread });
    });
    return items;
  }, [messageThreads, likesCards]);

  const fadeIn = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  const chatTranslate = chatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_H, 0],
  });

  const chatScale = chatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });

  const renderListItem = ({ item, index }) => {
    if (item.type === 'header') {
            return (
              <Animated.View
                style={[
                  styles.header,
                  {
                    opacity: fadeIn,
                    transform: [
                      {
                        translateY: headerAnim.interpolate({
                          inputRange: [0, 1],
                    outputRange: [-24, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSubtitle}>Catch up with your latest connections</Text>
              </Animated.View>
      );
    }

    if (item.type === 'likes') {
      return (
        <View style={styles.likesSection}>
          <View style={styles.likesHeaderRow}>
            <Text style={[styles.sectionTitle, styles.sectionTitleTight]}>Likes</Text>
            {likesCards.length > 0 && (
              <Text style={styles.likesSubtitle}>They already like you—take a peek</Text>
            )}
          </View>
          {likesLoading ? (
            <View style={styles.matchesLoader}>
              <ActivityIndicator size="small" color="#F76A8C" />
            </View>
          ) : likesError ? (
            <Text style={styles.matchesError}>{likesError}</Text>
          ) : likesCards.length === 0 ? (
            <Text style={styles.likesEmpty}>No likes yet—keep swiping to get noticed.</Text>
          ) : (
            <FlatList
              data={likesCards}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(like, index) => {
                const baseId =
                  like?.id ??
                  like?.profile?.id ??
                  like?.likerId ??
                  like?.profile?.likerId ??
                  `idx-${index}`;
                return `like-${String(baseId)}-${index}`;
              }}
              contentContainerStyle={styles.likesListContent}
              renderItem={({ item: likeItem }) => (
                <LikeCard item={likeItem} onPress={() => openProfile(likeItem.profile)} />
              )}
            />
          )}
        </View>
      );
    }

    if (item.type === 'matches') {
            return (
              <View style={styles.matchesSection}>
                <Text style={styles.sectionTitle}>Matches</Text>
          {matchesLoading ? (
            <View style={styles.matchesLoader}>
              <ActivityIndicator size="small" color="#5BC0F8" />
            </View>
          ) : matchesError ? (
            <Text style={styles.matchesError}>{matchesError}</Text>
          ) : matchCards.length === 0 ? (
            <Text style={styles.matchesEmpty}>Start swiping to discover new matches.</Text>
          ) : (
            <FlatList
              data={matchCards}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 10 }}
              keyExtractor={(match, index) => {
                const baseId =
                  match?.id ??
                  match?.raw?.id ??
                  match?.raw?.match_id ??
                  match?.raw?.matchId ??
                  `idx-${index}`;
                return `match-${String(baseId)}-${index}`;
              }}
              renderItem={({ item: matchItem }) => (
                <MatchBubble item={matchItem} onPress={() => openChat(matchItem.raw)} />
              )}
            />
          )}
        </View>
      );
    }

    if (item.type === 'message' && item.data) {
      return (
        <MessagePreview
          index={index}
          item={item.data}
          headerAnim={headerAnim}
          onPress={() => openChat(item.data.raw)}
        />
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#E8F6FF', '#F3FAFF']} style={StyleSheet.absoluteFill} />
      <TopNavBar />
      <FlatList
        data={combinedData}
        keyExtractor={(item, idx) => `${item.type}-${idx}`}
        renderItem={renderListItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      />

      {selectedThread && (
        <Animated.View
          style={[
            styles.chatContainer,
            {
              transform: [{ translateY: chatTranslate }, { scale: chatScale }, { scale: liftScale }],
              opacity: chatAnim,
              shadowOpacity: glowOpacity,
            },
          ]}
          {...chatPanResponder.panHandlers}
        >
          <LinearGradient
            colors={['#E8F6FF', '#F3FAFF', '#FFFFFF']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 1, y: 1 }}
            pointerEvents="none"
          />
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: 'rgba(91,192,248,0.25)',
                opacity: glowOpacity,
              },
            ]}
          />
          <KeyboardAvoidingView
            style={styles.chatWrapper}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? CHAT_OVERLAY_TOP_OFFSET : 0}
          >
            <View style={styles.chatHeader}>
              <TouchableOpacity style={styles.backPill} onPress={closeChat} activeOpacity={0.7}>
                <Text style={styles.backGlyph}>‹</Text>
              </TouchableOpacity>
              <View style={styles.chatIdentity}>
                <Image
                  source={
                    getAvatar(selectedThread.raw)
                      ? { uri: getAvatar(selectedThread.raw) }
                      : require('./assets/no-image-available.png')
                  }
                  style={styles.chatAvatar}
                />
                <View>
                  <Text style={styles.chatName}>{selectedThread.name}</Text>
                  {selectedThread.raw?.location ? (
                    <Text style={styles.chatSubtitle}>{selectedThread.raw.location}</Text>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.chatBody}>
              {loadingThread ? (
                <ActivityIndicator size="small" color="#5BC0F8" />
              ) : messages.length === 0 ? (
                <Text style={styles.chatPlaceholder}>Your conversation will start here.</Text>
              ) : (
                <FlatList
                  ref={listRef}
                  data={messages}
                  keyExtractor={(msg, index) => {
                    const key = msg?.clientKey ?? msg?.id ?? msg?.created_at ?? `idx-${index}`;
                    return `message-${String(key)}`;
                  }}
                  renderItem={({ item, index }) => (
                    <AnimatedMessageBubble
                      item={item}
                      index={index}
                      isSelf={item.sender_id === user?.id}
                    />
                  )}
                  ListFooterComponent={<View style={{ height: 12 }} />}
                  contentContainerStyle={styles.chatList}
                  onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>

            <Animated.View style={[styles.chatInputContainer, { transform: [{ scale: inputScale }] }]}>
              <View style={styles.chatInputWrapper}>
                <TextInput
                  style={styles.chatInput}
                  value={text}
                  onChangeText={setText}
                  placeholder="Type a message..."
                  placeholderTextColor="#8EA1B8"
                  multiline
                  onSubmitEditing={handleSend}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  returnKeyType="send"
                />
                <TouchableOpacity
                  style={{ opacity: sending || text.trim() === '' ? 0.5 : 1 }}
                  onPress={handleSend}
                  disabled={sending || text.trim() === ''}
                  activeOpacity={0.9}
                >
                  <Animated.View style={{ transform: [{ scale: sendScale }] }}>
                    <LinearGradient colors={['#5BC0F8', '#007AFF']} style={styles.chatSendButton}>
                      <Text style={styles.chatSendText}>↑</Text>
                    </LinearGradient>
                  </Animated.View>
                </TouchableOpacity>
                      </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}
                    </View>
  );
}

function LikeCard({ item, onPress }) {
  const timeAgo = formatRelativeTime(item.likedAt);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={styles.likeCardWrapper}>
        <LinearGradient colors={['#FFE8F0', '#FFF5F8']} style={styles.likeCard}>
          <Image
            source={item.avatar ? { uri: item.avatar } : require('./assets/no-image-available.png')}
            style={styles.likeAvatar}
          />
          <Text style={styles.likeName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.location ? (
            <Text style={styles.likeLocation} numberOfLines={1}>
              {item.location}
            </Text>
          ) : null}
          {timeAgo ? (
            <View style={styles.likeMetaPill}>
              <Text style={styles.likeMetaText}>{timeAgo}</Text>
            </View>
          ) : null}
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
}

function MatchBubble({ item, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={styles.matchBubbleContainer}>
        <LinearGradient colors={['#FFFFFF', '#DDF4FF']} style={styles.matchBubble}>
          <Image
            source={item.avatar ? { uri: item.avatar } : require('./assets/no-image-available.png')}
            style={styles.matchImage}
          />
        </LinearGradient>
        <Text style={styles.matchName} numberOfLines={1}>
          {item.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function MessagePreview({ item, index, onPress, headerAnim }) {
  const translateY = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20 + index * 4, 0],
  });

  const opacity = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <Animated.View
      style={[
        styles.messageItem,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <View style={styles.messageCard}>
          <Image
            source={item.avatar ? { uri: item.avatar } : require('./assets/no-image-available.png')}
            style={styles.messageAvatar}
          />
          <View style={styles.messageInfo}>
            <View style={styles.messageHeaderRow}>
              <Text style={styles.messageName}>{item.name}</Text>
              <Text style={styles.messageTime}>{formatRelativeTime(item.lastMessageAt)}</Text>
            </View>
            <Text style={styles.messagePreview} numberOfLines={1}>
              {item.lastMessage || PLACEHOLDER_MESSAGE}
            </Text>
          </View>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function AnimatedMessageBubble({ item, index, isSelf }) {
  const translateY = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rippleScale = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const delay = 70 * index;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 360, delay, useNativeDriver: false }),
      Animated.spring(translateY, { toValue: 0, speed: 14, bounciness: 7, delay, useNativeDriver: false }),
    ]).start();

    Animated.sequence([
      Animated.delay(delay + 160),
      Animated.parallel([
        Animated.timing(rippleScale, { toValue: 3, duration: 500, useNativeDriver: false }),
        Animated.timing(rippleOpacity, { toValue: 0, duration: 500, useNativeDriver: false }),
      ]),
    ]).start(() => {
      rippleScale.setValue(0);
      rippleOpacity.setValue(0.6);
    });
  }, [index, opacity, rippleOpacity, rippleScale, translateY]);

  const timeLabel = item.created_at
    ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <Animated.View
      style={[
        styles.messageWrapper,
        isSelf ? styles.messageRight : styles.messageLeft,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={{ position: 'relative' }}>
        <Animated.View
          style={[
            styles.ripple,
            {
              backgroundColor: isSelf ? 'rgba(91,192,248,0.35)' : 'rgba(91,192,248,0.15)',
              opacity: rippleOpacity,
              transform: [{ scale: rippleScale }],
            },
          ]}
        />
        <LinearGradient
          colors={
            isSelf ? ['#5BC0F8', '#007AFF'] : ['rgba(255,255,255,0.85)', 'rgba(235,246,255,0.95)']
          }
          style={[styles.messageBubble, isSelf ? styles.bubbleRight : styles.bubbleLeft]}
        >
          <Text style={[styles.messageText, { color: isSelf ? '#fff' : '#2C3E50' }]}>
            {item.content || item.text}
          </Text>
        </LinearGradient>
      </View>
      <Text style={styles.time}>{timeLabel}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 96,
    paddingHorizontal: 24,
    paddingBottom: 18,
  },
  headerTitle: { fontSize: 34, fontWeight: '800', color: '#063970' },
  headerSubtitle: { marginTop: 6, color: '#5C738A', fontSize: 15, fontWeight: '500' },
  likesSection: { marginBottom: 24 },
  likesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  likesSubtitle: { fontSize: 13, color: '#7A94AA', fontWeight: '600' },
  likesEmpty: {
    paddingHorizontal: 24,
    color: '#7A94AA',
    fontSize: 14,
  },
  likesListContent: { paddingHorizontal: 24, paddingBottom: 10 },
  likeCardWrapper: { marginRight: 16 },
  likeCard: {
    width: 150,
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#F76A8C',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  likeAvatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 12, backgroundColor: '#fff' },
  likeName: { fontSize: 15, fontWeight: '700', color: '#A61B4C', textTransform: 'capitalize', textAlign: 'center' },
  likeLocation: { fontSize: 12, color: '#C75C91', textAlign: 'center', marginTop: 2 },
  likeMetaPill: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  likeMetaText: { fontSize: 11, fontWeight: '700', color: '#A61B4C' },
  matchesSection: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#063970',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sectionTitleTight: {
    paddingHorizontal: 0,
    marginBottom: 0,
  },
  matchesLoader: {
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchesError: {
    textAlign: 'center',
    color: '#E53935',
    fontWeight: '600',
    paddingHorizontal: 24,
  },
  matchesEmpty: {
    paddingHorizontal: 24,
    color: '#5C738A',
    fontSize: 14,
  },
  matchBubbleContainer: {
    alignItems: 'center',
    marginRight: 18,
  },
  matchBubble: {
    width: 78,
    height: 78,
    borderRadius: 39,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5BC0F8',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  matchImage: { width: 70, height: 70, borderRadius: 35 },
  matchName: {
    fontSize: 12,
    marginTop: 8,
    color: '#063970',
    fontWeight: '600',
    maxWidth: 70,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  messageItem: { paddingHorizontal: 24, marginBottom: 14 },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#5BC0F8',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  messageAvatar: { width: 52, height: 52, borderRadius: 26, marginRight: 16 },
  messageInfo: { flex: 1 },
  messageHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  messageName: { fontSize: 16, fontWeight: '700', color: '#063970' },
  messageTime: { fontSize: 12, color: '#7A94AA', fontWeight: '600' },
  messagePreview: { marginTop: 6, fontSize: 14, color: '#4F6E88', fontWeight: '500' },
  unreadBadge: {
    backgroundColor: '#FF4C4C',
    borderRadius: 12,
    minWidth: 24,
    paddingHorizontal: 6,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  chatContainer: {
    position: 'absolute',
    top: CHAT_OVERLAY_TOP_OFFSET,
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    shadowColor: '#5BC0F8',
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 18,
  },
  chatWrapper: { flex: 1 },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(91,192,248,0.18)',
  },
  backPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(91,192,248,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  backGlyph: { fontSize: 24, color: '#007AFF', marginTop: -2 },
  chatIdentity: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  chatAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 14 },
  chatName: { fontSize: 20, fontWeight: '800', color: '#063970' },
  chatSubtitle: { fontSize: 13, color: '#5C738A', marginTop: 2 },
  chatBody: { flex: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 18 },
  chatPlaceholder: { color: '#8EA1B8', fontSize: 15, textAlign: 'center', marginTop: 40 },
  chatList: { paddingBottom: 18 },
  chatInputContainer: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  chatInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    shadowColor: '#5BC0F8',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  chatInput: {
    flex: 1,
    fontSize: 16,
    color: '#063970',
    paddingVertical: 10,
    paddingHorizontal: 10,
    maxHeight: 140,
  },
  chatSendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  chatSendText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  messageWrapper: { marginVertical: 8, maxWidth: SCREEN_W * 0.8 },
  messageLeft: { alignSelf: 'flex-start' },
  messageRight: { alignSelf: 'flex-end' },
  messageBubble: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: SCREEN_W * 0.8,
    shadowColor: '#5BC0F8',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
  ripple: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 40,
    height: 40,
    borderRadius: 20,
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  bubbleLeft: { borderBottomLeftRadius: 6 },
  bubbleRight: { borderBottomRightRadius: 6 },
  messageText: { fontSize: 16, lineHeight: 22 },
  time: { fontSize: 11, color: '#5C738A', marginTop: 4, marginHorizontal: 6, textAlign: 'right' },
});
