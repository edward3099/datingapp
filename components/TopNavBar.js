import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Pressable, Animated, StyleSheet, Dimensions, Platform, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { AntDesign, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { matchService } from '../services/matchService';
import { messageService } from '../services/messageService';
import supabase from '../config/supabase';
import { logger } from '../utils/logger';

const { width } = Dimensions.get('window');

/* ---------- NavButton ---------- */
function NavButton({ type = 'swipe', active, focused, onPress, badgeCount = 0 }) {
  const scale = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  const gradients = {
    swipe: ['#FF6B6B', '#C81D25'],
    messages: ['#00C6FF', '#0072FF'],
    profile: ['#C77DFF', '#7F00FF'],
  };

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 0.92 : active ? 1.08 : 1,
        friction: 5,
        tension: 100,
        useNativeDriver: false,
      }),
      Animated.timing(fade, {
        toValue: focused ? 0.7 : 1,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start();
  }, [focused, active]);

  const handlePress = () => {
    // Stop any running animations first
    lift.stopAnimation();
    scale.stopAnimation();
    glow.stopAnimation();
    
    // Start animations separately to avoid mixing native/JS drivers
    Animated.parallel([
      Animated.timing(lift, { toValue: -6, duration: 120, useNativeDriver: false }),
      Animated.spring(scale, { toValue: 1.1, friction: 5, tension: 120, useNativeDriver: false }),
    ]).start();
    
    // Start JS driver animation separately
    setTimeout(() => {
      Animated.timing(glow, { toValue: 1, duration: 180, useNativeDriver: false }).start(() => {
        Animated.parallel([
        Animated.spring(lift, { toValue: 0, friction: 6, tension: 100, useNativeDriver: false }),
        Animated.spring(scale, { toValue: 1.08, friction: 6, tension: 120, useNativeDriver: false }),
        ]).start();
        
        Animated.timing(glow, { toValue: 0, duration: 350, useNativeDriver: false }).start(() => {
          onPress();
        });
      });
    }, 0);
  };

  // Note: shadowColor cannot be animated with native driver, using static shadow
  const glowShadow = gradients[type][0] + '99';

  const renderIcon = () => {
    if (type === 'messages') return <Feather name="send" size={20} color="#fff" />;
    if (type === 'swipe') return <AntDesign name="heart" size={20} color="#fff" />;
    return <AntDesign name="user" size={20} color="#fff" />;
  };

  const showBadge = type === 'messages' && badgeCount > 0;

  return (
    <Pressable onPress={handlePress} style={styles.pressArea}>
      <View
        style={{
          shadowColor: glowShadow,
          shadowOpacity: active ? 0.6 : 0.3,
          shadowRadius: active ? 14 : 6,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <Animated.View
          style={[
            styles.buttonWrapper,
            {
              transform: [{ translateY: lift }, { scale }],
              opacity: fade,
            },
          ]}
        >
          <LinearGradient
            colors={gradients[type]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.button, active && { opacity: 1 }]}
          >
            {renderIcon()}
            <View style={styles.reflection} />
          </LinearGradient>
          {showBadge && (
            <View style={[styles.badge, badgeCount > 9 && styles.badgeWide]}>
              <Text style={styles.badgeText}>{badgeCount > 9 ? '10+' : badgeCount}</Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Pressable>
  );
}

/* ---------- TopNavBar ---------- */
export default function TopNavBar() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(-20)).current;
  const [badgeCount, setBadgeCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const matchesRef = useRef([]);
  const seenMatchesRef = useRef(new Set());
  const conversationIdsRef = useRef(new Set());
  const matchUnsubscribeRef = useRef(null);
  const messageChannelRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Calculate top position accounting for status bar (iOS status bar is typically 44-50px)
  const topPosition = Platform.OS === 'ios' ? Math.max(insets.top + 8, 50) : 10;

  // Determine current screen based on route name
  const getCurrentScreen = () => {
    const routeName = route.name;
    if (routeName === 'SwipeScreen') return 'swipe';
    if (routeName === 'Messages') return 'messages';
    if (routeName === 'UserProfile') return 'profile';
    return null; // For other screens like ViewProfile, return null to allow navigation
  };

  const current = getCurrentScreen();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 700, useNativeDriver: false }),
      Animated.spring(lift, { toValue: 0, friction: 6, tension: 100, useNativeDriver: false }),
    ]).start();
  }, []);

  const handleNavPress = (type) => {
    // Always navigate when clicking a button, especially from screens like ViewProfile
    if (type === 'swipe') {
      navigation.navigate('SwipeScreen');
    } else if (type === 'messages') {
      navigation.navigate('Messages');
    } else if (type === 'profile') {
      navigation.navigate('UserProfile');
    }
  };

  const computeBadgeFromMatches = useCallback(
    (matches, unread) => {
      const unseenMatches = matches.filter((match) => match?.id && !seenMatchesRef.current.has(match.id));
      if (!isMountedRef.current) return;
      setUnreadMessageCount(unread);
      setBadgeCount(unread + unseenMatches.length);
    },
    []
  );

  const refreshCounts = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      matchesRef.current = [];
      conversationIdsRef.current = new Set();
      if (!isMountedRef.current) return;
      setBadgeCount(0);
      setUnreadMessageCount(0);
      return;
    }

    try {
      const [matchesResult, unreadResult] = await Promise.all([
        matchService.getMatches(),
        messageService.getUnreadCount(),
      ]);

      if (matchesResult?.error) {
        throw matchesResult.error;
      }
      if (unreadResult?.error) {
        throw unreadResult.error;
      }

      const matchList = Array.isArray(matchesResult?.matches) ? matchesResult.matches : [];
      matchesRef.current = matchList;
      conversationIdsRef.current = new Set(
        matchList.map((match) => match?.conversation_id).filter(Boolean)
      );

      const unreadCount = typeof unreadResult?.count === 'number' ? unreadResult.count : 0;
      computeBadgeFromMatches(matchList, unreadCount);
    } catch (error) {
      logger.error?.('TopNavBar refresh counts error', {
        error: error?.message || String(error),
        stack: error?.stack,
        userId: user?.id,
      });
    }
  }, [computeBadgeFromMatches, isAuthenticated, user?.id]);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      if (matchUnsubscribeRef.current) {
        try {
          matchUnsubscribeRef.current();
        } catch (error) {
          logger.error?.('TopNavBar match unsubscribe error', {
            error: error?.message || String(error),
            stack: error?.stack,
          });
        }
        matchUnsubscribeRef.current = null;
      }
      if (messageChannelRef.current) {
        supabase.removeChannel(messageChannelRef.current);
        messageChannelRef.current = null;
      }
      seenMatchesRef.current = new Set();
      matchesRef.current = [];
      conversationIdsRef.current = new Set();
      if (isMountedRef.current) {
        setBadgeCount(0);
        setUnreadMessageCount(0);
      }
      return;
    }

    let isActive = true;

    (async () => {
      try {
        const unsubscribe = await matchService.subscribeToMatches(() => {
          if (isActive) {
            refreshCounts();
          }
        });
        matchUnsubscribeRef.current = unsubscribe;
      } catch (error) {
        logger.error?.('TopNavBar subscribeToMatches error', {
          error: error?.message || String(error),
          stack: error?.stack,
        });
      }
    })();

    const channel = supabase
      .channel(`nav-messages-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          try {
            const message = payload?.new;
            if (!message) return;
            if (message.sender_id === user.id) return;

            const conversationId = message.conversation_id;

            if (conversationIdsRef.current.has(conversationId)) {
              messageService
                .getUnreadCount()
                .then((result) => {
                  if (result?.error) throw result.error;
                  const unreadCount = typeof result?.count === 'number' ? result.count : 0;
                  computeBadgeFromMatches(matchesRef.current, unreadCount);
                })
                .catch((error) => {
                  logger.error?.('TopNavBar unread refresh error', {
                    error: error?.message || String(error),
                    stack: error?.stack,
                  });
                });
            } else {
              refreshCounts();
            }
          } catch (error) {
            logger.error?.('TopNavBar message channel error', {
              error: error?.message || String(error),
              stack: error?.stack,
            });
          }
        }
      )
      .subscribe();

  messageChannelRef.current = channel;

    return () => {
      isActive = false;
      if (matchUnsubscribeRef.current) {
        try {
          matchUnsubscribeRef.current();
        } catch (error) {
          logger.error?.('TopNavBar match unsubscribe cleanup error', {
            error: error?.message || String(error),
            stack: error?.stack,
          });
        }
        matchUnsubscribeRef.current = null;
      }
      if (channel) {
        supabase.removeChannel(channel);
        messageChannelRef.current = null;
      }
    };
  }, [isAuthenticated, refreshCounts, user?.id, computeBadgeFromMatches]);

  useEffect(() => {
    if (route.name === 'Messages') {
      let updated = false;
      matchesRef.current.forEach((match) => {
        if (match?.id && !seenMatchesRef.current.has(match.id)) {
          seenMatchesRef.current.add(match.id);
          updated = true;
        }
      });
      if (updated) {
        setBadgeCount(unreadMessageCount);
      }
      refreshCounts();
    }
  }, [route.name, refreshCounts, unreadMessageCount]);

  return (
    <Animated.View style={[styles.container, { top: topPosition, opacity: fadeIn, transform: [{ translateY: lift }] }]}>
      <BlurView intensity={95} tint="light" style={styles.navWrap}>
        <NavButton
          type="swipe"
          active={current === 'swipe'}
          focused={current !== 'swipe'}
          onPress={() => handleNavPress('swipe')}
        />
        <NavButton
          type="messages"
          active={current === 'messages'}
          focused={current !== 'messages'}
          onPress={() => handleNavPress('messages')}
          badgeCount={badgeCount}
        />
        <NavButton
          type="profile"
          active={current === 'profile'}
          focused={current !== 'profile'}
          onPress={() => handleNavPress('profile')}
        />
      </BlurView>
    </Animated.View>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  navWrap: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: width * 0.7,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.45)',
    shadowColor: '#5BC0F8',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
  },
  pressArea: { alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reflection: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    height: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  buttonWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF5A5F',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeWide: {
    minWidth: 24,
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
