import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import TopNavBar from '../components/TopNavBar';
import { profileService } from '../services/profileService';
import { swipeService } from '../services/swipeService';
import { logger } from '../utils/logger';
import MatchCelebration from '../components/MatchCelebration';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W * 0.94;
const CARD_H = CARD_W * 1.35;
const PLACEHOLDER_IMAGE = require('./assets/no-image-available.png');

const resolveImageSource = (profile) => {
  const imageUri = profile?.imageUri || profile?.avatar_url || profile?.avatarUrl;

  if (!imageUri) return PLACEHOLDER_IMAGE;
  if (typeof imageUri === 'number') return imageUri;
  if (typeof imageUri === 'string') return { uri: imageUri };
  if (typeof imageUri === 'object' && imageUri.uri) return { uri: imageUri.uri };
  return PLACEHOLDER_IMAGE;
};

const normalizeMetrics = (profile) => {
  const raw = profile?.compatibility_metrics || profile?.metrics;
  if (!raw) return null;

  const messageCount = raw.message_count ?? raw.total_messages ?? 0;
  const recentCount = raw.recent_message_count ?? 0;
  const lastMessageAt = raw.last_message_at ?? null;
  const hasHistory = messageCount > 0 || recentCount > 0 || lastMessageAt !== null;

  const toPercent = (value) => {
    if (value === null || value === undefined) return null;
    return Math.max(0, Math.min(100, Math.round(Number(value) * 100)));
  };

  return {
    activity: hasHistory ? toPercent(raw.activity ?? raw.activityScore ?? raw.red_flag ?? raw.redFlag) : null,
    banter: hasHistory ? toPercent(raw.banter ?? raw.banterScore) : null,
    ghost: hasHistory ? toPercent(raw.ghost ?? raw.ghostChance) : null,
  };
};

const TagChip = ({ label }) => (
  <View style={styles.tagChip}>
    <Text style={styles.tagChipText}>{label}</Text>
  </View>
);

export default function ProfileOfOtherPeopleScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const initialProfile = route.params?.profile;
  const [profileData, setProfileData] = useState(initialProfile || null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!initialProfile?.id) return;

    let isMounted = true;
    setLoadingDetails(true);
    setLoadError(null);

    profileService
      .getProfileWithCompatibility(initialProfile.id)
      .then(({ profile, error }) => {
        if (!isMounted) return;
        if (error) {
          const message = error?.message || (typeof error === 'string' ? error : '');
          if (message) setLoadError(message);
          return;
        }
        if (profile) {
          setProfileData((prev) => ({ ...(prev || initialProfile), ...profile }));
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        const message = error?.message || (typeof error === 'string' ? error : '');
        if (message) setLoadError(message);
      })
      .finally(() => {
        if (isMounted) {
          setLoadingDetails(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [initialProfile?.id]);

  const profile = profileData;

  const metrics = useMemo(() => normalizeMetrics(profile), [profile]);
  const displayName = useMemo(() => {
    if (!profile) return '';
    if (profile.name) return profile.name;
    if (profile.display_name) return profile.display_name;
    if (profile.first_name) return profile.first_name;
    return 'Profile';
  }, [profile]);

  if (!profile) {
    return (
      <View style={styles.emptyContainer}>
        <LinearGradient colors={['#E8F6FF', '#FFFFFF']} style={StyleSheet.absoluteFill} />
        <TopNavBar />
        <View style={styles.emptyState}>
          <AntDesign name="warning" size={42} color="#5BC0F8" />
          <Text style={styles.emptyTitle}>Profile unavailable</Text>
          <Text style={styles.emptySubtitle}>
            We couldn’t find the profile you’re looking for. Try refreshing your matches.
          </Text>
        </View>
      </View>
    );
  }

  const heroSource = resolveImageSource(profile);
  const bio = profile.bio || profile.about || profile.description || 'No bio available yet.';
  const location = profile.location || profile.city;
  const age = profile.age || profile.user_age;
  const interests = Array.isArray(profile.tags)
    ? profile.tags
    : Array.isArray(profile.interests)
    ? profile.interests
    : [];

  const likeScale = useRef(new Animated.Value(1)).current;
  const dislikeScale = useRef(new Animated.Value(1)).current;
  const cardShake = useRef(new Animated.Value(0)).current;

  const likeTagOpacity = useRef(new Animated.Value(0)).current;
  const likeTagTranslate = useRef(new Animated.Value(-10)).current;
  const likeGlow = useRef(new Animated.Value(0)).current;

  const passTagOpacity = useRef(new Animated.Value(0)).current;
  const passTagTranslate = useRef(new Animated.Value(-10)).current;
  const passGlow = useRef(new Animated.Value(0)).current;

  const activityValue = useRef(new Animated.Value(0)).current;
  const banterValue = useRef(new Animated.Value(0)).current;
  const ghostValue = useRef(new Animated.Value(0)).current;
  const activityGlow = useRef(new Animated.Value(0)).current;
  const banterGlow = useRef(new Animated.Value(0)).current;
  const ghostGlow = useRef(new Animated.Value(0)).current;

  const [liked, setLiked] = useState(false);
  const [passed, setPassed] = useState(false);
  const [activityPercent, setActivityPercent] = useState(0);
  const [banterPercent, setBanterPercent] = useState(0);
  const [ghostPercent, setGhostPercent] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchCelebrationVisible, setMatchCelebrationVisible] = useState(false);
  const [swipeError, setSwipeError] = useState(null);

  useEffect(() => {
    const animateMetric = (valueRef, glowRef, targetPercent = null, setPercent) => {
      const target = typeof targetPercent === 'number' ? Math.max(0, Math.min(targetPercent, 100)) / 100 : 0;

      Animated.parallel([
        Animated.timing(valueRef, {
          toValue: target,
          duration: 2200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowRef, { toValue: 1, duration: 700, useNativeDriver: false }),
            Animated.timing(glowRef, { toValue: 0, duration: 700, useNativeDriver: false }),
          ]),
          { iterations: 2 }
        ),
      ]).start();

      if (typeof targetPercent === 'number') {
        let current = 0;
        const step = targetPercent / 60;
        const interval = setInterval(() => {
          current += step;
          if (current >= targetPercent) {
            current = targetPercent;
            clearInterval(interval);
          }
          setPercent(Math.round(current));
        }, 35);
        return () => clearInterval(interval);
      } else {
        setPercent(0);
      }
      return undefined;
    };

    const cleanups = [];
    cleanups.push(animateMetric(activityValue, activityGlow, metrics?.activity ?? null, setActivityPercent));
    cleanups.push(animateMetric(banterValue, banterGlow, metrics?.banter ?? null, setBanterPercent));
    cleanups.push(animateMetric(ghostValue, ghostGlow, metrics?.ghost ?? null, setGhostPercent));

    return () => {
      cleanups.forEach((cleanup) => typeof cleanup === 'function' && cleanup());
    };
  }, [metrics, activityValue, banterValue, ghostValue, activityGlow, banterGlow, ghostGlow]);

  const shakeCard = () => {
    cardShake.setValue(0);
    Animated.sequence([
      Animated.timing(cardShake, { toValue: 12, duration: 70, useNativeDriver: false }),
      Animated.timing(cardShake, { toValue: -12, duration: 70, useNativeDriver: false }),
      Animated.timing(cardShake, { toValue: 6, duration: 70, useNativeDriver: false }),
      Animated.timing(cardShake, { toValue: -6, duration: 70, useNativeDriver: false }),
      Animated.timing(cardShake, { toValue: 0, duration: 70, useNativeDriver: false }),
    ]).start();
  };

  const performSwipe = useCallback(
    async (direction) => {
      if (!profile?.id) return;
      setSwipeError(null);
      try {
        setIsSubmitting(true);
        const { isMatch, error } = await swipeService.swipe(profile.id, direction);
        if (error) throw error;
        if (isMatch) {
          setMatchCelebrationVisible(true);
        }
      } catch (error) {
        const message = error?.message || 'Unable to update swipe.';
        setSwipeError(message);
        logger.error?.('Profile swipe error', {
          direction,
          profileId: profile?.id,
          error: message,
          stack: error?.stack,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [profile?.id]
  );

  const handleLike = () => {
    if (isSubmitting) return;
    setLiked(true);
    setPassed(false);
    shakeCard();
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.2, useNativeDriver: false }),
      Animated.spring(likeScale, { toValue: 1, useNativeDriver: false }),
    ]).start();
    Animated.parallel([
      Animated.timing(likeTagOpacity, { toValue: 1, duration: 350, useNativeDriver: false }),
      Animated.spring(likeTagTranslate, { toValue: 0, useNativeDriver: false }),
    ]).start();
    Animated.sequence([
      Animated.timing(likeGlow, { toValue: 1, duration: 400, useNativeDriver: false }),
      Animated.timing(likeGlow, { toValue: 0, duration: 400, useNativeDriver: false }),
    ]).start();
    performSwipe('like');
  };

  const handleDislike = () => {
    if (isSubmitting) return;
    setPassed(true);
    setLiked(false);
    shakeCard();
    Animated.sequence([
      Animated.spring(dislikeScale, { toValue: 1.16, useNativeDriver: false }),
      Animated.spring(dislikeScale, { toValue: 1, useNativeDriver: false }),
    ]).start();
    Animated.parallel([
      Animated.timing(passTagOpacity, { toValue: 1, duration: 350, useNativeDriver: false }),
      Animated.spring(passTagTranslate, { toValue: 0, useNativeDriver: false }),
    ]).start();
    Animated.sequence([
      Animated.timing(passGlow, { toValue: 1, duration: 400, useNativeDriver: false }),
      Animated.timing(passGlow, { toValue: 0, duration: 400, useNativeDriver: false }),
    ]).start();
    performSwipe('pass');
  };

  const likeGlowColor = likeGlow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,145,145,0.3)', 'rgba(255,90,90,0.8)'],
  });

  const passGlowColor = passGlow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(176,140,255,0.3)', 'rgba(128,0,255,0.8)'],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E8F6FF', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <TopNavBar />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center', paddingBottom: 200 }}
      >
        <Animated.View
          style={[
            styles.heroContainer,
            {
              transform: [{ translateX: cardShake }],
              marginTop: 90,
            },
          ]}
        >
          <Image source={heroSource} style={styles.heroImage} />
          <LinearGradient colors={['transparent', 'rgba(255,255,255,0.9)']} style={styles.heroFade} />

          {liked ? (
            <Animated.View
              style={[
                styles.likeTagContainer,
                {
                  opacity: likeTagOpacity,
                  transform: [{ translateY: likeTagTranslate }],
                  backgroundColor: likeGlowColor,
                },
              ]}
            >
              <Text style={styles.likeTagText}>LIKE</Text>
            </Animated.View>
          ) : null}

          {passed ? (
            <Animated.View
              style={[
                styles.passTagContainer,
                {
                  opacity: passTagOpacity,
                  transform: [{ translateY: passTagTranslate }],
                  backgroundColor: passGlowColor,
                },
              ]}
            >
              <Text style={styles.passTagText}>PASS</Text>
            </Animated.View>
          ) : null}
        </Animated.View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>
              {displayName}
              {age ? `, ${age}` : ''}
            </Text>
            {profile.pronouns ? (
              <Text style={styles.pronouns}>{profile.pronouns}</Text>
            ) : null}
          </View>

          {location ? (
            <Text style={styles.location}>📍 {location}</Text>
          ) : null}

          <Text style={styles.bio}>{bio}</Text>

          {interests.length > 0 && (
            <View style={styles.tagContainer}>
              {interests.slice(0, 10).map((tag) => (
                <TagChip key={tag} label={tag} />
              ))}
            </View>
          )}

          {loadingDetails ? (
            <View style={styles.metricsLoading}> 
              <ActivityIndicator size="small" color="#5BC0F8" />
              <Text style={styles.metricsLoadingText}>Loading compatibility insights…</Text>
            </View>
          ) : metrics ? (
            <View style={styles.metricsContainer}>
              <AnimatedMetricBar
                label="Activity"
                color="#FF6B6B"
                valueRef={activityValue}
                glowRef={activityGlow}
                percent={metrics.activity !== null ? activityPercent : null}
              />
              <AnimatedMetricBar
                label="Banter"
                color="#00C851"
                valueRef={banterValue}
                glowRef={banterGlow}
                percent={metrics.banter !== null ? banterPercent : null}
              />
              <AnimatedMetricBar
                label="Ghost"
                color="#5BC0F8"
                valueRef={ghostValue}
                glowRef={ghostGlow}
                percent={metrics.ghost !== null ? ghostPercent : null}
              />
            </View>
          ) : (
            <Text style={styles.metricsPlaceholder}>
              Compatibility insights unlock once you both start chatting.
            </Text>
          )}

          {loadError ? (
            <Text style={styles.metricsError}>We couldn’t refresh compatibility data. Try again later.</Text>
          ) : null}
        </View>
      </Animated.ScrollView>

      <View style={styles.actionBar}>
        <Pressable onPress={handleDislike}>
          <Animated.View style={{ transform: [{ scale: dislikeScale }] }}>
            <LinearGradient
              colors={passed ? ['#808080', '#A0A0A0'] : ['#A020F0', '#C77DFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionButton}
            >
              <AntDesign name="close" size={34} color="#fff" />
            </LinearGradient>
          </Animated.View>
        </Pressable>

        <Pressable onPress={handleLike}>
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <LinearGradient
              colors={liked ? ['#808080', '#A0A0A0'] : ['#FF6B6B', '#C81D25']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionButton}
            >
              <AntDesign name="heart" size={34} color="#fff" />
            </LinearGradient>
          </Animated.View>
        </Pressable>
      </View>

      <MatchCelebration
        visible={matchCelebrationVisible}
        name={displayName}
        subtitle="You both liked each other – say hello in Messages."
        onContinue={() => setMatchCelebrationVisible(false)}
        onMessage={() => {
          setMatchCelebrationVisible(false);
          navigation.navigate('Messages');
        }}
      />

      {swipeError ? <Text style={styles.swipeError}>{swipeError}</Text> : null}
    </View>
  );
}

function AnimatedMetricBar({ label, color, valueRef, glowRef, percent }) {
  const width = valueRef.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const shadowColor = glowRef.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0)', `${color}88`],
  });

  const hasValue = percent !== null && percent !== undefined;
  const display = hasValue ? `${percent}%` : '–';

  return (
    <View style={styles.metricItem}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, { color }]}>{display}</Text>
      </View>
      <View style={styles.metricBarBackground}>
        {hasValue ? (
          <Animated.View
            style={[
              styles.metricBarFill,
              {
                backgroundColor: color,
                width,
                shadowColor,
                shadowOpacity: 0.6,
                shadowRadius: 9,
                shadowOffset: { width: 0, height: 0 },
              },
            ]}
          />
        ) : (
          <View style={[styles.metricBarFill, { backgroundColor: 'transparent', width: '100%' }]} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6FAFF' },
  heroContainer: {
    borderRadius: 30,
    overflow: 'hidden',
    width: CARD_W,
    height: CARD_H,
    backgroundColor: '#fff',
    shadowColor: '#5BC0F8',
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
  },
  heroImage: { width: '100%', height: '100%', borderRadius: 30 },
  heroFade: { position: 'absolute', bottom: 0, height: 160, width: '100%' },
  likeTagContainer: {
    position: 'absolute',
    top: 24,
    right: 22,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  likeTagText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  passTagContainer: {
    position: 'absolute',
    top: 24,
    left: 22,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  passTagText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  content: { width: CARD_W, marginTop: 30 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 32, fontWeight: '800', color: '#063970' },
  pronouns: { fontSize: 16, fontWeight: '600', color: '#5C738A' },
  location: { fontSize: 16, color: '#5C738A', marginTop: 8 },
  bio: { fontSize: 16, color: '#5C738A', lineHeight: 22, marginTop: 16 },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(91,192,248,0.15)',
  },
  tagChipText: { color: '#063970', fontWeight: '700', textTransform: 'capitalize' },
  metricsContainer: { marginTop: 28, gap: 18 },
  metricItem: { marginBottom: 4 },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricLabel: { fontSize: 14, color: '#063970', fontWeight: '600', letterSpacing: 0.3 },
  metricValue: { fontSize: 14, fontWeight: '700' },
  metricBarBackground: {
    height: 10,
    backgroundColor: '#E0E6ED',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 6,
  },
  metricBarFill: { height: '100%', borderRadius: 10 },
  metricsPlaceholder: {
    marginTop: 28,
    fontSize: 15,
    color: '#5C738A',
    textAlign: 'center',
  },
  emptyContainer: { flex: 1 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: '#063970', marginTop: 16 },
  emptySubtitle: { fontSize: 16, color: '#5C738A', textAlign: 'center', marginTop: 8 },
  metricsLoading: {
    marginTop: 28,
    alignItems: 'center',
  },
  metricsLoadingText: {
    marginTop: 6,
    fontSize: 14,
    color: '#5C738A',
  },
  metricsError: {
    marginTop: 12,
    fontSize: 13,
    color: '#FF6B6B',
    textAlign: 'center',
  },
  actionBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 32,
  },
  actionButton: {
    width: 86,
    height: 86,
    borderRadius: 43,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  swipeError: {
    position: 'absolute',
    bottom: 120,
    left: 24,
    right: 24,
    textAlign: 'center',
    color: '#C81D25',
    fontSize: 13,
    fontWeight: '600',
  },
});
