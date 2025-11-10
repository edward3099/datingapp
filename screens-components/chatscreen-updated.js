import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { matchService } from '../services/matchService';
import { messageService } from '../services/messageService';
import { logger } from '../utils/logger';
import TopNavBar from '../components/TopNavBar';

export default function ChatsScreen() {
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let unsubscribe;
    let isMounted = true;

    loadMatches().catch((error) => {
      logger.error('Failed to load matches in useEffect', {
        error: error?.message || String(error),
        stack: error?.stack,
        userId: user?.id,
      });
    });

    const setupSubscription = async () => {
      try {
        const maybeUnsubscribe = await matchService.subscribeToMatches((newMatch) => {
          if (!isMounted) return;
          logger.info('New match received via subscription', {
            matchId: newMatch?.id,
          });
          loadMatches().catch((error) => {
            logger.error('Failed to reload matches after new match', {
              error: error?.message || String(error),
              stack: error?.stack,
            });
          });
        });

        if (typeof maybeUnsubscribe === 'function') {
          unsubscribe = maybeUnsubscribe;
        }
      } catch (error) {
        logger.error('Failed to subscribe to matches', {
          error: error?.message || String(error),
          stack: error?.stack,
        });
      }
    };

    setupSubscription();

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (error) {
          logger.warn('Error during match subscription cleanup', {
            error: error?.message || String(error),
            stack: error?.stack,
          });
        }
      }
    };
  }, [isAuthenticated]);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const { matches: matchList, error } = await matchService.getMatches();
      if (error) throw error;

      setMatches(matchList || []);

      // Load unread counts
      const counts = {};
      for (const match of matchList || []) {
        if (match.conversation_id) {
          try {
            const { count } = await messageService.getUnreadCount(match.conversation_id);
            counts[match.conversation_id] = count || 0;
          } catch (countError) {
            logger.error('Failed to get unread count', {
              error: countError?.message || String(countError),
              conversationId: match.conversation_id,
            });
            counts[match.conversation_id] = 0;
          }
        }
      }
      setUnreadCounts(counts);
    } catch (error) {
      logger.error('Load matches error', {
        error: error?.message || String(error),
        stack: error?.stack,
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

  const subscribeToMatches = () => {
    try {
      const unsubscribe = matchService.subscribeToMatches((newMatch) => {
        loadMatches().catch((error) => {
          logger.error('Failed to reload matches after new match', {
            error: error?.message || String(error),
            stack: error?.stack,
          });
        });
      });
      return unsubscribe;
    } catch (error) {
      logger.error('Error setting up match subscription', {
        error: error?.message || String(error),
        stack: error?.stack,
      });
      return () => {}; // Return no-op unsubscribe
    }
  };

  const renderMatch = ({ item }) => {
    const otherUser = item.user_a_id === user?.id ? item.user_b : item.user_a;
    const unreadCount = unreadCounts[item.conversation_id] || 0;

    return (
      <TouchableOpacity
        style={styles.matchItem}
        onPress={() => {
          navigation.navigate('Messages', {
            matchId: item.id,
            conversationId: item.conversation_id,
            otherUser,
          });
        }}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={
              otherUser?.avatar_url
                ? { uri: otherUser.avatar_url }
                : require('./assets/no-image-available.png')
            }
            style={styles.avatar}
          />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.matchInfo}>
          <Text style={styles.matchName}>
            {otherUser?.display_name || otherUser?.first_name || 'Unknown'}
          </Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.last_message?.content || 'Start a conversation...'}
          </Text>
        </View>
        <Text style={styles.time}>
          {item.last_message?.created_at
            ? new Date(item.last_message.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#E8F6FF', '#F3FAFF']} style={StyleSheet.absoluteFill} />
        <TopNavBar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5BC0F8" />
          <Text style={styles.loadingText}>Loading matches...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#E8F6FF', '#F3FAFF']} style={StyleSheet.absoluteFill} />
      <TopNavBar />
      {matches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No matches yet</Text>
          <Text style={styles.emptySubtext}>Start swiping to find your match!</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          renderItem={renderMatch}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#5BC0F8', fontWeight: '600' },
  list: { paddingTop: 80, paddingHorizontal: 16 },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#5BC0F8',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  avatarContainer: { position: 'relative', marginRight: 12 },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF4C4C',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  matchInfo: { flex: 1 },
  matchName: { fontSize: 18, fontWeight: '700', color: '#063970', marginBottom: 4 },
  lastMessage: { fontSize: 14, color: '#666', fontWeight: '500' },
  time: { fontSize: 12, color: '#999', fontWeight: '500' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 24, fontWeight: '700', color: '#063970', marginBottom: 8 },
  emptySubtext: { fontSize: 16, color: '#666', textAlign: 'center' },
});

