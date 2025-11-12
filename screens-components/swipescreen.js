import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import {
  View,
  StyleSheet,
  Dimensions,
  Image,
  Text,
  Pressable,
  PanResponder,
  Animated,
  Easing,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { AntDesign } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { profileService } from '../services/profileService'
import { swipeService } from '../services/swipeService'
import { logger } from '../utils/logger'
import TopNavBar from '../components/TopNavBar'
import MatchCelebration from '../components/MatchCelebration'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const { width: SCREEN_W } = Dimensions.get('window')

const MAX_CARD_W = 420
const SIDE_PADDING = 24
const CARD_W = Math.min(SCREEN_W - SIDE_PADDING, MAX_CARD_W)
const CARD_H = Math.max(560, Math.min(720, Math.round(CARD_W * 1.55)))
const CARD_TOP_OFFSET = 120

const SWIPE_DISTANCE = Math.max(CARD_W * 0.28, 90)
const SWIPE_VELOCITY = 0.18
const TAP_MAX_DISTANCE = 8
const TAP_MAX_DURATION = 200

const colours = {
  heart: '#A020F0',
  dislike: '#B0B0B0',
  ink: '#FFFFFF',
  sub: '#F2F2F2',
  hairline: 'rgba(255,255,255,0.6)',
  roseShadow: '#5BC0F8',
  glassTint: 'rgba(0,0,0,0.35)',
  warmTint: 'rgba(91,192,248,0.08)',
}

const LIKE_FEEDBACK = ['nice choice', 'good instinct', 'solid pick', 'great vibe']
const PASS_FEEDBACK = ['kept standards high', 'staying selective', 'fair call']
const TIP_DISLIKES_3 = 'try widening tags in filters'

const dedupeProfiles = (profiles) => {
  const seen = new Set();
  return profiles.filter((profile) => {
    if (!profile?.id) return true;
    if (seen.has(profile.id)) {
      return false;
    }
    seen.add(profile.id);
    return true;
  });
};

const DEFAULT_FILTERS = {
  gender: 'any',
  minAge: 18,
  maxAge: 60,
  interests: [],
  hasPhoto: false,
  location: '',
};

const toDraftFilters = (filterState) => ({
  gender: filterState.gender,
  minAge: String(filterState.minAge),
  maxAge: String(filterState.maxAge),
  interests: [...filterState.interests],
  hasPhoto: filterState.hasPhoto,
  location: filterState.location,
});

const FILTER_TAG_OPTIONS = [
  'music',
  'art',
  'travel',
  'sports',
  'tech',
  'books',
  'fashion',
  'pets',
  'film',
  'fitness',
];

const MAX_FILTER_INTERESTS = 3;

export default function SwipeScreen() {
  const navigation = useNavigation()
  const { user, isAuthenticated, profile } = useAuth()
  const insets = useSafeAreaInsets()
  const [deck, setDeck] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS })
  const [filterModalVisible, setFilterModalVisible] = useState(false)
  const [draftFilters, setDraftFilters] = useState(toDraftFilters(DEFAULT_FILTERS))
  const [matchCelebration, setMatchCelebration] = useState(null)
  const [maxAgePickerVisible, setMaxAgePickerVisible] = useState(false)
  const [locationInputModalVisible, setLocationInputModalVisible] = useState(false)
  const [tempLocationValue, setTempLocationValue] = useState('')
  const appliedProfileFiltersRef = useRef(false)
  const maxAgeInputRef = useRef(null)
  const locationInputRef = useRef(null)

  const applyDiscoveryFilters = useCallback(
    ({ gender, minAge, maxAge } = {}) => {
      if (appliedProfileFiltersRef.current) return

      const allowedGenders = new Set(['male', 'female', 'other', 'any'])
      const normalizedGenderCandidate =
        typeof gender === 'string' && gender.length ? gender.toLowerCase() : 'any'
      const normalizedGender = allowedGenders.has(normalizedGenderCandidate)
        ? normalizedGenderCandidate
        : 'any'

      const toNumber = (value) => {
        if (typeof value === 'number' && Number.isFinite(value)) return value
        if (typeof value === 'string') {
          const parsed = parseInt(value, 10)
          return Number.isNaN(parsed) ? null : parsed
        }
        return null
      }

      const candidateMin = toNumber(minAge)
      const candidateMax = toNumber(maxAge)
      const sanitizedMin = Math.max(18, candidateMin ?? DEFAULT_FILTERS.minAge)
      const maxSeed = candidateMax ?? DEFAULT_FILTERS.maxAge
      const sanitizedMax = Math.max(sanitizedMin, Math.min(99, maxSeed))

      appliedProfileFiltersRef.current = true

      setFilters((prev) => {
        const next = {
          ...prev,
          gender: normalizedGender,
          minAge: sanitizedMin,
          maxAge: sanitizedMax,
        }
        setDraftFilters(toDraftFilters(next))
        return next
      })
    },
    [setDraftFilters]
  )

  const applyRelationshipFilter = useCallback(
    (profiles) => {
      if (!profiles?.length) return []
      return profiles.filter((profile) => {
        if (!profile) return false

        const profileGender = String(
          profile.gender ||
            profile.profile?.gender ||
            profile.profile?.gender_identity ||
            profile.profile?.preferred_gender ||
            profile.user?.gender ||
            ''
        ).toLowerCase()

        if (filters.gender !== 'any') {
          if (!profileGender || profileGender !== filters.gender) {
            return false
          }
        }

        const profileAgeRaw =
          profile.age ??
          profile.profile?.age ??
          (typeof profile.profile?.birth_year === 'number'
            ? new Date().getFullYear() - profile.profile.birth_year
            : null)

        if (typeof profileAgeRaw === 'number' && Number.isFinite(profileAgeRaw)) {
          if (profileAgeRaw < filters.minAge) return false
          if (profileAgeRaw > filters.maxAge) return false
        }

        if (filters.hasPhoto) {
          const hasPhoto =
            !!profile.imageUri?.uri ||
            !!profile.avatar_url ||
            !!profile.profile?.avatar_url ||
            !!profile.profile?.photo_url ||
            !!profile.profile?.photo

          if (!hasPhoto) return false
        }

        if (filters.interests.length) {
          const profileTagsRaw =
            profile.tags ||
            profile.profile?.tags ||
            profile.profile?.interests ||
            profile.metadata?.tags ||
            []

          const normalizedTags = Array.isArray(profileTagsRaw)
            ? profileTagsRaw
                .map((tag) =>
                  typeof tag === 'string'
                    ? tag.trim().toLowerCase()
                    : typeof tag?.slug === 'string'
                    ? tag.slug.trim().toLowerCase()
                    : null
                )
                .filter(Boolean)
            : []

          const hasInterestMatch = normalizedTags.some((tag) => filters.interests.includes(tag))
          if (!hasInterestMatch) return false
        }

        const trimmedLocation = (filters.location ?? '').trim().toLowerCase()
        if (trimmedLocation.length) {
          const profileLocation =
            profile.location ||
            profile.profile?.location ||
            profile.metadata?.location ||
            ''

          const normalizedLocation = typeof profileLocation === 'string' ? profileLocation.trim().toLowerCase() : ''
          if (!normalizedLocation.includes(trimmedLocation)) {
            return false
          }
        }

        return true
      })
    },
    [filters]
  )

  const filteredDeck = useMemo(() => applyRelationshipFilter(deck), [deck, applyRelationshipFilter])
  const visible = useMemo(() => filteredDeck.slice(0, 3), [filteredDeck])

  const openFilterModal = useCallback(() => {
    setDraftFilters(toDraftFilters(filters))
    setFilterModalVisible(true)
  }, [filters])

  const closeFilterModal = useCallback(() => {
    setFilterModalVisible(false)
  }, [])

  const handleDraftGenderSelect = useCallback((value) => {
    setDraftFilters((prev) => ({ ...prev, gender: value }))
  }, [])

  const handleDraftMinAgeChange = useCallback((value) => {
    const numeric = value.replace(/[^0-9]/g, '')
    setDraftFilters((prev) => ({ ...prev, minAge: numeric }))
  }, [])

  const handleDraftMaxAgeChange = useCallback((value) => {
    const numeric = value.replace(/[^0-9]/g, '')
    setDraftFilters((prev) => {
      const nextMax = numeric === '' ? '' : numeric
      return {
        ...prev,
        maxAge: nextMax,
      }
    })
  }, [])

  const handleDraftMaxAgeEndEditing = useCallback(() => {
    setDraftFilters((prev) => {
      const parsedMin = parseInt(prev.minAge, 10)
      const parsedMax = parseInt(prev.maxAge, 10)
      const minVal = Number.isNaN(parsedMin) ? DEFAULT_FILTERS.minAge : parsedMin

      if (Number.isNaN(parsedMax)) {
        return {
          ...prev,
          maxAge: String(Math.max(minVal, DEFAULT_FILTERS.minAge)),
        }
      }

      const clamped = Math.max(minVal, Math.min(99, parsedMax))
      if (String(clamped) !== prev.maxAge) {
        return { ...prev, maxAge: String(clamped) }
      }
      return prev
    })
  }, [])

  const toggleDraftInterest = useCallback((tag) => {
    const normalized = tag.toLowerCase()
    setDraftFilters((prev) => {
      const alreadySelected = prev.interests.includes(normalized)
      if (alreadySelected) {
        return { ...prev, interests: prev.interests.filter((t) => t !== normalized) }
      }
      if (prev.interests.length >= MAX_FILTER_INTERESTS) {
        return prev
      }
      return { ...prev, interests: [...prev.interests, normalized] }
    })
  }, [])

  const handleToggleHasPhoto = useCallback((value) => {
    setDraftFilters((prev) => ({ ...prev, hasPhoto: value }))
  }, [])

  const handleDraftLocationChange = useCallback((value) => {
    setDraftFilters((prev) => ({ ...prev, location: value }))
  }, [])

  const openMaxAgePicker = useCallback(() => {
    setMaxAgePickerVisible(true)
  }, [])

  const selectMaxAge = useCallback((age) => {
    const parsedMin = parseInt(draftFilters.minAge, 10)
    const minVal = Number.isNaN(parsedMin) ? DEFAULT_FILTERS.minAge : parsedMin
    const clamped = Math.max(minVal, Math.min(99, age))
    setDraftFilters((prev) => ({ ...prev, maxAge: String(clamped) }))
    setMaxAgePickerVisible(false)
  }, [draftFilters.minAge])

  const openLocationInput = useCallback(() => {
    setTempLocationValue(draftFilters.location)
    setLocationInputModalVisible(true)
  }, [draftFilters.location])

  const saveLocation = useCallback(() => {
    setDraftFilters((prev) => ({ ...prev, location: tempLocationValue }))
    setLocationInputModalVisible(false)
  }, [tempLocationValue])

  const handleApplyFilters = useCallback(() => {
    const parsedMin = parseInt(draftFilters.minAge, 10)
    const parsedMax = parseInt(draftFilters.maxAge, 10)

    let sanitizedMin = Number.isNaN(parsedMin) ? DEFAULT_FILTERS.minAge : parsedMin
    let sanitizedMax = Number.isNaN(parsedMax) ? DEFAULT_FILTERS.maxAge : parsedMax

    sanitizedMin = Math.max(18, Math.min(99, sanitizedMin))
    sanitizedMax = Math.max(18, Math.min(99, sanitizedMax))

    if (sanitizedMax < sanitizedMin) {
      sanitizedMax = sanitizedMin
    }

    const sanitizedLocation = (draftFilters.location ?? '').trim()

    setFilters({
      gender: draftFilters.gender,
      minAge: sanitizedMin,
      maxAge: sanitizedMax,
      interests: [...draftFilters.interests],
      hasPhoto: draftFilters.hasPhoto,
      location: sanitizedLocation,
    })
    setFilterModalVisible(false)
  }, [draftFilters])

  const handleResetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS })
    setDraftFilters(toDraftFilters(DEFAULT_FILTERS))
    setFilterModalVisible(false)
  }, [])

  const filterTop = useMemo(
    () => (Platform.OS === 'ios' ? Math.max(insets.top + 6, 46) : Math.max(insets.top + 8, 10)),
    [insets.top]
  )

  useEffect(() => {
    if (!profile || appliedProfileFiltersRef.current) return

    const hasPrefData =
      profile.preferred_gender != null ||
      profile.preferred_min_age != null ||
      profile.preferred_max_age != null

    if (!hasPrefData) return

    applyDiscoveryFilters({
      gender: profile.preferred_gender,
      minAge: profile.preferred_min_age,
      maxAge: profile.preferred_max_age,
    })
  }, [profile, applyDiscoveryFilters])

  useEffect(() => {
    if (!isAuthenticated || appliedProfileFiltersRef.current) return

    let cancelled = false
    profileService
      .getPreferences()
      .then(({ preferences, error }) => {
        if (cancelled || appliedProfileFiltersRef.current) return
        if (error || !preferences) return

        const preferencePayload = {
          gender:
            (Array.isArray(preferences.show_me) && preferences.show_me.length > 0 && preferences.show_me[0] !== 'any')
              ? preferences.show_me[0]
              : preferences.preferred_gender ??
                preferences.gender ??
                preferences.gender_preference ??
                null,
          minAge:
            preferences.age_min ??
            preferences.min_age ??
            preferences.preferred_min_age ??
            preferences.min_preferred_age ??
            null,
          maxAge:
            preferences.age_max ??
            preferences.max_age ??
            preferences.preferred_max_age ??
            preferences.max_preferred_age ??
            null,
        }

        applyDiscoveryFilters(preferencePayload)
      })
      .catch((error) => {
        logger.warn?.('Discovery preferences load warning', {
          error: error?.message || String(error),
        })
      })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, applyDiscoveryFilters])


  // Load recommendations on mount and when deck is low
  useEffect(() => {
    if (isAuthenticated) {
      loadRecommendations().catch((error) => {
        logger.error('Failed to load recommendations in useEffect', {
          error: error?.message || String(error),
          stack: error?.stack,
          userId: user?.id,
        })
      })
    }
  }, [isAuthenticated])

  // Load more when deck is low
  useEffect(() => {
    if ((deck.length <= 3 || filteredDeck.length <= 3) && !loadingMore && isAuthenticated) {
      loadMoreRecommendations().catch((error) => {
        logger.error('Failed to load more recommendations in useEffect', {
          error: error?.message || String(error),
          stack: error?.stack,
          userId: user?.id,
        })
      })
    }
  }, [deck.length, filteredDeck.length])

  const loadRecommendations = async () => {
    if (!isAuthenticated) return

    setLoading(true)
    try {
      const { profiles, error } = await profileService.getRecommendations(25)
      if (error) throw error

      // Transform profiles to match card format
      const transformed = (profiles || []).map((profile) => {
        const resolvedName =
          profile.display_name ||
          profile.first_name ||
          profile.full_name ||
          profile.preferred_name ||
          profile.nickname ||
          profile.nick_name ||
          profile.handle ||
          profile.user_name ||
          profile.given_name ||
          profile.name ||
          profile.last_name ||
          (profile.profile &&
            (profile.profile.display_name ||
              profile.profile.first_name ||
              profile.profile.full_name ||
              profile.profile.preferred_name ||
              profile.profile.nickname ||
              profile.profile.name)) ||
          (profile.metadata &&
            (profile.metadata.display_name ||
              profile.metadata.first_name ||
              profile.metadata.full_name ||
              profile.metadata.name)) ||
          (profile.public_profile &&
            (profile.public_profile.display_name ||
              profile.public_profile.first_name ||
              profile.public_profile.full_name)) ||
          (profile.user && (profile.user.display_name || profile.user.full_name || profile.user.email)) ||
          (profile.email ? profile.email.split('@')[0] : null) ||
          'Match';

        return {
          id: profile.id,
          name: resolvedName,
          age: profile.age || profile.profile?.age || 25,
          imageUri: profile.avatar_url
            ? { uri: profile.avatar_url }
            : profile.profile?.avatar_url
            ? { uri: profile.profile.avatar_url }
            : require('./assets/no-image-available.png'),
          tags: profile.tags || profile.profile?.tags || [],
          bio: profile.bio || profile.profile?.bio,
          location: profile.location || profile.profile?.location,
          profile: {
            ...profile,
            compatibility_metrics: profile.compatibility_metrics || profile.metrics || null,
          },
        };
      })
        .filter((card) => card.id && typeof card.name === 'string' && card.name.trim().length > 0);

      const uniqueDeck = dedupeProfiles(transformed)
      setDeck(uniqueDeck)
      logger.info('Recommendations loaded', { count: uniqueDeck.length })
    } catch (error) {
      logger.error('Load recommendations error', {
        error: error?.message || String(error),
        stack: error?.stack,
        userId: user?.id,
        errorDetails: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      })
      Alert.alert('Error', 'Failed to load profiles. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadMoreRecommendations = async () => {
    if (loadingMore || !isAuthenticated) return

    setLoadingMore(true)
    try {
      const { profiles, error } = await profileService.getRecommendations(25)
      if (error) throw error

      const transformed = (profiles || []).map((profile) => {
        const resolvedName =
          profile.display_name ||
          profile.first_name ||
          profile.full_name ||
          profile.preferred_name ||
          profile.nickname ||
          profile.nick_name ||
          profile.handle ||
          profile.user_name ||
          profile.given_name ||
          profile.name ||
          profile.last_name ||
          (profile.profile &&
            (profile.profile.display_name ||
              profile.profile.first_name ||
              profile.profile.full_name ||
              profile.profile.preferred_name ||
              profile.profile.nickname ||
              profile.profile.name)) ||
          (profile.metadata &&
            (profile.metadata.display_name ||
              profile.metadata.first_name ||
              profile.metadata.full_name ||
              profile.metadata.name)) ||
          (profile.public_profile &&
            (profile.public_profile.display_name ||
              profile.public_profile.first_name ||
              profile.public_profile.full_name)) ||
          (profile.user && (profile.user.display_name || profile.user.full_name || profile.user.email)) ||
          (profile.email ? profile.email.split('@')[0] : null) ||
          'Match';

        return {
          id: profile.id,
          name: resolvedName,
          age: profile.age || profile.profile?.age || 25,
          imageUri: profile.avatar_url
            ? { uri: profile.avatar_url }
            : profile.profile?.avatar_url
            ? { uri: profile.profile.avatar_url }
            : require('./assets/no-image-available.png'),
          tags: profile.tags || profile.profile?.tags || [],
          bio: profile.bio || profile.profile?.bio,
          location: profile.location || profile.profile?.location,
          profile: {
            ...profile,
            compatibility_metrics: profile.compatibility_metrics || profile.metrics || null,
          },
        };
      })
        .filter((card) => card.id && typeof card.name === 'string' && card.name.trim().length > 0);

      setDeck((prev) => {
        const filtered = applyRelationshipFilter(transformed)
        const merged = [...prev, ...filtered]
        const unique = dedupeProfiles(merged)
        logger.info('More recommendations loaded', { count: unique.length - prev.length })
        return unique
      })
    } catch (error) {
      logger.error('Load more recommendations error', {
        error: error?.message || String(error),
        stack: error?.stack,
        userId: user?.id,
        errorDetails: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      })
    } finally {
      setLoadingMore(false)
    }
  }

  const pan = useRef(new Animated.ValueXY()).current
  const isAnimating = useRef(false)
  const isSwiping = useRef(false)

  const likeScaleFromPan = pan.x.interpolate({
    inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2],
    outputRange: [0.7, 0.85, 1.28],
    extrapolate: 'clamp',
  })
  const dislikeScaleFromPan = pan.x.interpolate({
    inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2],
    outputRange: [1.28, 0.85, 0.7],
    extrapolate: 'clamp',
  })
  const likeTap = useRef(new Animated.Value(1)).current
  const dislikeTap = useRef(new Animated.Value(1)).current

  const animateTap = (v) => {
    v.setValue(1)
    Animated.sequence([
      Animated.timing(v, { toValue: 0.94, duration: 80, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.spring(v, { toValue: 1, useNativeDriver: false, speed: 20, bounciness: 6 }),
    ]).start()
  }

  const toastQueueRef = useRef([])
  const toastShowingRef = useRef(false)
  const [toastText, setToastText] = useState(null)
  const toastAnim = useRef(new Animated.Value(0)).current

  const enqueueToast = (text) => {
    toastQueueRef.current.push(text)
    if (!toastShowingRef.current) playNextToast()
  }

  const playNextToast = () => {
    if (toastQueueRef.current.length === 0) {
      toastShowingRef.current = false
      return
    }
    toastShowingRef.current = true
    const next = toastQueueRef.current.shift()
    setToastText(next)
    toastAnim.stopAnimation()
    toastAnim.setValue(0)
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 160, useNativeDriver: false }),
      Animated.delay(900),
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start(() => {
      setToastText(null)
      setTimeout(playNextToast, 40)
    })
  }

  const [consecutiveDislikes, setConsecutiveDislikes] = useState(0)
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

  const flingOff = (dir, done) => {
    pan.stopAnimation()
    Animated.timing(pan, {
      toValue: { x: dir * (SCREEN_W + 240), y: 0 },
      duration: 360,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(() => {
      pan.setValue({ x: 0, y: 0 })
      if (done) done()
    })
  }

  const commitSwipe = (type) => {
    if (isAnimating.current || !visible[0]) return
    isAnimating.current = true

    const currentProfile = visible[0]
    const direction = type === 'like' ? 'like' : 'pass'

    const dir = type === 'like' ? 1 : -1
    flingOff(dir, () => {
      setDeck((prev) => prev.filter((profile) => profile.id !== currentProfile.id))
      requestAnimationFrame(() => {
        isAnimating.current = false
        isSwiping.current = false
      })
    })

    if (type === 'like') {
      setConsecutiveDislikes(0)
      enqueueToast(pick(LIKE_FEEDBACK))
    } else {
      const next = consecutiveDislikes + 1
      setConsecutiveDislikes(next)
      enqueueToast(next >= 3 ? TIP_DISLIKES_3 : pick(PASS_FEEDBACK))
      if (next >= 3) setConsecutiveDislikes(0)
    }

    if (currentProfile.id && isAuthenticated) {
      swipeService
        .swipe(currentProfile.id, direction)
        .then(({ swipe, isMatch, match, error }) => {
          if (error) {
            logger.error('Swipe recording error', {
              error: error?.message || String(error),
              stack: error?.stack,
              targetId: currentProfile.id,
              direction,
              userId: user?.id,
              errorDetails: error instanceof Error
                ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                  }
                : error,
            })
            return
          }

          if (isMatch && match) {
            setMatchCelebration({
              name: currentProfile.name || 'Your match',
              profileId: currentProfile.id,
            })
          }
        })
        .catch((error) => {
          logger.error('Swipe commit error', {
            error: error?.message || String(error),
            stack: error?.stack,
            targetId: currentProfile.id,
            direction,
            userId: user?.id,
            errorDetails: error instanceof Error
              ? {
                  name: error.name,
                  message: error.message,
                  stack: error.stack,
                }
              : error,
          })
        })
    }
  }

  const panStartTime = useRef(0)

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !isAnimating.current,
    onMoveShouldSetPanResponder: (evt, g) => {
      if (isAnimating.current) return false
      const movedEnough = Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5
      if (!movedEnough) return false
      isSwiping.current = true
      return true
    },
    onPanResponderGrant: () => {
      panStartTime.current = Date.now()
      pan.stopAnimation()
    },
    onPanResponderMove: (evt, gesture) => {
      if (isAnimating.current) return
      isSwiping.current = true
      Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })(evt, gesture)
    },
    onPanResponderRelease: (e, g) => {
      if (isAnimating.current) return
      
      const moveDistance = Math.sqrt(g.dx * g.dx + g.dy * g.dy)
      const timeElapsed = Date.now() - panStartTime.current

      // Check if it was a swipe
      const horizontalIntent = Math.abs(g.dx) > SWIPE_DISTANCE
      const velocityIntent =
        Math.abs(g.vx) > SWIPE_VELOCITY && Math.abs(g.dx) > SWIPE_DISTANCE * 0.45
      const intent = horizontalIntent || velocityIntent
      logger.info('Pan release evaluated', {
        profileId: visible[0]?.id,
        moveDistance,
        timeElapsed,
        intent,
        velocityX: g.vx,
        deltaX: g.dx,
        isSwiping: isSwiping.current,
      })
      if (intent) {
        commitSwipe(g.dx > 0 ? 'like' : 'dislike')
      } else {
        // Small movement, spring back
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, speed: 16, bounciness: 7 }).start(() => {
          isSwiping.current = false
        })
        if (visible[0] && moveDistance <= TAP_MAX_DISTANCE && timeElapsed <= TAP_MAX_DURATION) {
          isSwiping.current = false
          handleCardPress(visible[0], 'top-card')
        }
      }
      if (!intent) {
        isSwiping.current = false
      }
    },
    onPanResponderTerminationRequest: () => false,
  }), [visible, pan])

  const handleCardPress = (profile, source = 'top-card') => {
    if (isAnimating.current) return

    if (isSwiping.current) return

    logger.info('Profile card pressed', { profileId: profile.id, source })
    navigation.navigate('ProfileOfOtherPeople', { profile })
  }

  const rotateZ = pan.x.interpolate({
    inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
  })

  const tiltX = pan.y.interpolate({
    inputRange: [-120, 0, 120],
    outputRange: ['5deg', '0deg', '-5deg'],
    extrapolate: 'clamp',
  })

  const tiltY = pan.x.interpolate({
    inputRange: [-140, 0, 140],
    outputRange: ['-6deg', '0deg', '6deg'],
    extrapolate: 'clamp',
  })

  const topId = visible[0]?.id

  if (loading && filteredDeck.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#E8F6FF', '#F3FAFF']} style={StyleSheet.absoluteFill} />
        <Pressable onPress={openFilterModal} style={[styles.filterTag, { top: filterTop }]}>
          <Text style={styles.filterTagText}>filter</Text>
        </Pressable>
        <TopNavBar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5BC0F8" />
          <Text style={styles.loadingText}>Loading profiles...</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#E8F6FF', '#F3FAFF']} style={StyleSheet.absoluteFill} />
      <Pressable onPress={openFilterModal} style={[styles.filterTag, { top: filterTop }]}>
        <Text style={styles.filterTagText}>filter</Text>
      </Pressable>
      <TopNavBar />

      <View style={[styles.deckContainer, { paddingTop: 110 }]} pointerEvents="box-none">
        {visible.length > 0 ? (
          visible.map((profile, i) => {
            const isTop = i === 0
            const zIndex = 100 - i
            const translateY = isTop ? 0 : 22 + (i - 1) * 14
            const translateX = isTop ? 0 : 12 + (i - 1) * 12
            const scale = isTop ? 1 : 0.96 - (i - 1) * 0.03
            const rotZ = isTop ? '0deg' : `${(i - 1) * 2.2 - 1.6}deg`
            return (
              <View key={profile.id} style={{ ...styles.cardWrapper, zIndex, top: CARD_TOP_OFFSET }} pointerEvents="box-none">
                {isTop ? (
                  <Animated.View
                    {...panResponder.panHandlers}
                    style={{
                      ...styles.cardContainer,
                      transform: [
                        { translateX: pan.x },
                        { translateY: pan.y },
                        { rotateZ },
                        { perspective: 1000 },
                        { rotateX: tiltX },
                        { rotateY: tiltY },
                      ],
                    }}
                  >
                    <Pressable style={{ flex: 1 }} onPress={() => handleCardPress(profile, 'top-card')}>
                      <Card profile={profile} isTop={isTop} pan={pan} />
                    </Pressable>
                  </Animated.View>
                ) : (
                  <Animated.View
                    style={{ ...styles.cardContainer, transform: [{ translateY }, { translateX }, { scale }, { rotate: rotZ }] }}
                  >
                    <Pressable style={{ flex: 1 }} onPress={() => handleCardPress(profile, 'stack-card')}>
                      <Card profile={profile} isTop={isTop} pan={null} />
                    </Pressable>
                  </Animated.View>
                )}
              </View>
            )
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {deck.length === 0 ? 'No more profiles right now' : 'No profiles match your filters'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {deck.length === 0
                ? 'Check back in a bit—new matches are on the way.'
                : 'Try widening your filters or clearing them to discover more people.'}
            </Text>
          </View>
        )}
      </View>

      {visible.length > 0 && (
        <View style={styles.actionBar}>
          <Pressable onPress={() => { animateTap(dislikeTap); if (topId) commitSwipe('dislike') }}>
            <Animated.View style={{ transform: [{ scale: Animated.multiply(dislikeScaleFromPan, dislikeTap) }] }}>
              <LinearGradient colors={['#C0C0C0', '#808080']} style={styles.actionButtonLarge}>
                <AntDesign name="close" size={40} color="#fff" />
              </LinearGradient>
            </Animated.View>
          </Pressable>

          <Pressable onPress={() => { animateTap(likeTap); if (topId) commitSwipe('like') }}>
            <Animated.View style={{ transform: [{ scale: Animated.multiply(likeScaleFromPan, likeTap) }] }}>
              <LinearGradient colors={['#FF6B6B', '#E63946']} style={styles.actionButtonLarge}>
                <AntDesign name="heart" size={40} color="#fff" />
              </LinearGradient>
            </Animated.View>
          </Pressable>
        </View>
      )}

      <MatchCelebration
        visible={!!matchCelebration}
        name={
          matchCelebration?.name ??
          (matchCelebration?.profileId
            ? visible.find((p) => p.id === matchCelebration.profileId)?.name
            : undefined)
        }
        onContinue={() => setMatchCelebration(null)}
        onMessage={() => {
          setMatchCelebration(null)
          navigation.navigate('Messages')
        }}
      />

      <Modal visible={filterModalVisible} animationType="fade" transparent>
        <View style={styles.modalRoot}>
          <TouchableWithoutFeedback onPress={closeFilterModal}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
          <View style={styles.filterModal}>
            <Text style={styles.filterTitle}>Filters</Text>
            <Text style={styles.filterSubtitle}>Fine-tune who appears in your deck.</Text>
            <ScrollView
              style={styles.filterScroll}
              contentContainerStyle={styles.filterContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.filterSection}>
                <Text style={styles.sectionLabel}>Show me</Text>
                <View style={styles.chipRow}>
                  {['any', 'female', 'male', 'other'].map((option) => {
                    const active = draftFilters.gender === option
                    return (
                      <Pressable
                        key={option}
                        onPress={() => handleDraftGenderSelect(option)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.sectionLabel}>Age range</Text>
                <View style={styles.ageRow}>
                  <View style={styles.ageField}>
                    <Text style={styles.ageLabel}>Min</Text>
                    <View style={styles.ageInputContainer}>
                      <TextInput
                        value={draftFilters.minAge}
                        onChangeText={handleDraftMinAgeChange}
                        keyboardType="number-pad"
                        style={styles.ageInputInner}
                        maxLength={2}
                        placeholder="18"
                        placeholderTextColor="#8EA1B8"
                        selectionColor="#063970"
                        underlineColorAndroid="transparent"
                        spellCheck={false}
                        autoCorrect={false}
                        autoComplete="off"
                        textContentType="none"
                        autoCapitalize="none"
                        importantForAutofill="no"
                        textAlign="center"
                        keyboardAppearance="light"
                        returnKeyType="done"
                        blurOnSubmit={true}
                      />
                    </View>
                  </View>
                  <Text style={styles.ageSeparator}>to</Text>
                  <View style={styles.ageField}>
                    <Text style={styles.ageLabel}>Max</Text>
                    <TextInput
                      value={draftFilters.maxAge || ''}
                      onChangeText={(text) => {
                        const num = text.replace(/[^0-9]/g, '')
                        if (num === '') {
                          setDraftFilters((prev) => ({ ...prev, maxAge: '' }))
                        } else {
                          const parsed = parseInt(num, 10)
                          const parsedMin = parseInt(draftFilters.minAge, 10)
                          const minVal = Number.isNaN(parsedMin) ? DEFAULT_FILTERS.minAge : parsedMin
                          if (parsed >= minVal && parsed <= 99) {
                            setDraftFilters((prev) => ({ ...prev, maxAge: num }))
                          } else if (num.length <= 2) {
                            // Allow typing partial numbers (e.g., "6" before "60")
                            setDraftFilters((prev) => ({ ...prev, maxAge: num }))
                          }
                        }
                      }}
                      onBlur={() => {
                        // Validate on blur - ensure it's within valid range
                        const parsed = parseInt(draftFilters.maxAge, 10)
                        const parsedMin = parseInt(draftFilters.minAge, 10)
                        const minVal = Number.isNaN(parsedMin) ? DEFAULT_FILTERS.minAge : parsedMin
                        if (draftFilters.maxAge && (Number.isNaN(parsed) || parsed < minVal || parsed > 99)) {
                          setDraftFilters((prev) => ({ ...prev, maxAge: String(Math.max(minVal, Math.min(99, parsed || minVal))) }))
                        }
                      }}
                      placeholder="60"
                      placeholderTextColor="#8EA1B8"
                      keyboardType="number-pad"
                      style={styles.ageInput}
                      textAlign="center"
                      maxLength={2}
                      autoCorrect={false}
                      spellCheck={false}
                      textContentType="none"
                      importantForAutofill="no"
                      keyboardAppearance="light"
                      returnKeyType="done"
                      blurOnSubmit={true}
                      selectionColor="#063970"
                      underlineColorAndroid="transparent"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.filterSection}>
                <View style={styles.toggleRow}>
                  <Text style={styles.sectionLabel}>Only show profiles with photos</Text>
                  <Switch value={draftFilters.hasPhoto} onValueChange={handleToggleHasPhoto} thumbColor="#fff" trackColor={{ false: '#CBD5E1', true: '#5BC0F8' }} />
                </View>
              </View>

            <View style={styles.filterSection}>
              <Text style={styles.sectionLabel}>Location</Text>
              <Text style={styles.sectionHint}>Enter a city or country to prioritise nearby matches.</Text>
              <TextInput
                value={draftFilters.location || ''}
                onChangeText={(text) => {
                  setDraftFilters((prev) => ({ ...prev, location: text }))
                }}
                placeholder="E.g. London, United Kingdom"
                placeholderTextColor="#8EA1B8"
                style={styles.locationInput}
                autoCorrect={false}
                spellCheck={false}
                textContentType="none"
                importantForAutofill="no"
                keyboardAppearance="light"
                returnKeyType="done"
                blurOnSubmit={true}
                selectionColor="#063970"
                underlineColorAndroid="transparent"
              />
            </View>

              <View style={styles.filterSection}>
                <Text style={styles.sectionLabel}>Interests</Text>
                <Text style={styles.sectionHint}>Pick up to {MAX_FILTER_INTERESTS} interests to match on.</Text>
                <View style={styles.chipWrap}>
                  {FILTER_TAG_OPTIONS.map((tag) => {
                    const normalized = tag.toLowerCase()
                    const active = draftFilters.interests.includes(normalized)
                    return (
                      <Pressable
                        key={tag}
                        onPress={() => toggleDraftInterest(tag)}
                        style={[styles.chip, styles.interestChip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {tag.replace(/_/g, ' ')}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.filterActions}>
              <Pressable style={styles.resetButton} onPress={handleResetFilters}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </Pressable>
              <Pressable style={styles.applyButton} onPress={handleApplyFilters}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Max Age Picker Modal */}
      <Modal
        visible={maxAgePickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMaxAgePickerVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMaxAgePickerVisible(false)}>
          <View style={styles.agePickerModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.agePickerModalContent}>
                <View style={styles.agePickerHeader}>
                  <Text style={styles.agePickerTitle}>Select Maximum Age</Text>
                  <Pressable
                    onPress={() => setMaxAgePickerVisible(false)}
                    style={styles.agePickerCloseButton}
                  >
                    <Text style={styles.agePickerCloseText}>Done</Text>
                  </Pressable>
                </View>
                <ScrollView
                  style={styles.agePickerScrollView}
                  contentContainerStyle={styles.agePickerScrollContent}
                  showsVerticalScrollIndicator={true}
                >
                  {Array.from({ length: 82 }, (_, i) => {
                    const age = 18 + i
                    const parsedMin = parseInt(draftFilters.minAge, 10)
                    const minVal = Number.isNaN(parsedMin) ? DEFAULT_FILTERS.minAge : parsedMin
                    const isSelected = draftFilters.maxAge === String(age)
                    const isDisabled = age < minVal
                    
                    return (
                      <Pressable
                        key={age}
                        onPress={() => !isDisabled && selectMaxAge(age)}
                        disabled={isDisabled}
                        style={[
                          styles.agePickerOption,
                          isSelected && styles.agePickerOptionSelected,
                          isDisabled && styles.agePickerOptionDisabled
                        ]}
                      >
                        <Text style={[
                          styles.agePickerOptionText,
                          isSelected && styles.agePickerOptionTextSelected,
                          isDisabled && styles.agePickerOptionTextDisabled
                        ]}>
                          {age}
                        </Text>
                      </Pressable>
                    )
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Location Input Modal */}
      <Modal
        visible={locationInputModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setLocationInputModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setLocationInputModalVisible(false)}>
          <View style={styles.locationModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.locationModalContent}>
                <View style={styles.locationModalHeader}>
                  <Text style={styles.locationModalTitle}>Enter Location</Text>
                  <Pressable
                    onPress={() => setLocationInputModalVisible(false)}
                    style={styles.locationModalCloseButton}
                  >
                    <Text style={styles.locationModalCloseText}>Cancel</Text>
                  </Pressable>
                </View>
                <View style={styles.locationModalInputContainer}>
                  <View style={styles.locationModalInputWrapper}>
                    <TextInput
                      value={tempLocationValue}
                      onChangeText={setTempLocationValue}
                      placeholder="E.g. London, United Kingdom"
                      placeholderTextColor="#8EA1B8"
                      style={styles.locationModalInput}
                      autoCapitalize="words"
                      returnKeyType="done"
                      onSubmitEditing={saveLocation}
                      autoFocus={true}
                      selectionColor="#063970"
                      underlineColorAndroid="transparent"
                      spellCheck={false}
                      autoCorrect={false}
                      autoComplete="off"
                      textContentType="oneTimeCode"
                      importantForAutofill="no"
                      backgroundColor="#F8FBFF"
                      blurOnSubmit={false}
                    />
                  </View>
                </View>
                <Pressable style={styles.locationModalSaveButton} onPress={saveLocation}>
                  <Text style={styles.locationModalSaveText}>Save</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  )
}
function Card({ profile, isTop, pan }) {
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    breathe.stopAnimation();
    breathe.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    );
    if (isTop) loop.start();
    return () => loop.stop();
  }, [isTop]);

  const breatheScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.01] });
  const breatheShadow = breathe.interpolate({ inputRange: [0, 1], outputRange: [12, 20] });

  const metricsSource = profile.profile?.compatibility_metrics || profile.compatibility_metrics || null;
  const activity = metricsSource?.activity ?? null;
  const banter = metricsSource?.banter ?? null;
  const ghost = metricsSource?.ghost ?? null;

  const likeOpacity = pan
    ? pan.x.interpolate({ inputRange: [0, 40, 160], outputRange: [0, 0, 1], extrapolate: 'clamp' })
    : new Animated.Value(0);

  const passOpacity = pan
    ? pan.x.interpolate({ inputRange: [-160, -40, 0], outputRange: [1, 0, 0], extrapolate: 'clamp' })
    : new Animated.Value(0);

  return (
    <Animated.View
      style={{
        ...styles.cardClip,
        shadowColor: '#5BC0F8',
        shadowOpacity: 0.25,
        shadowRadius: breatheShadow,
        shadowOffset: { width: 0, height: 10 },
        transform: [{ scale: isTop ? breatheScale : 1 }],
      }}
    >
      {profile.imageUri ? (
        <Image source={profile.imageUri} style={styles.cardImg} resizeMode="cover" />
      ) : (
        <View style={styles.cardImg} />
      )}
      <View style={styles.overlayWarm} />

      {isTop && Array.from({ length: 8 }).map((_, i) => <SubtleSpark key={i} delay={i * 600} />)}

      {isTop && (
        <>
          <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 24, left: 18, opacity: likeOpacity }}>
            <Image source={require('./assets/angel.png')} style={{ width: 100, height: 100 }} resizeMode="contain" />
          </Animated.View>

          <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 24, right: 18, opacity: passOpacity }}>
            <Image source={require('./assets/devil-Photoroom.png')} style={{ width: 100, height: 100 }} resizeMode="contain" />
          </Animated.View>
        </>
      )}

      <View style={styles.infoWrap}>
        <BlurView intensity={20} tint="light" style={styles.glass}>
          <View style={styles.infoInner}>
            <View style={styles.infoHeaderRow}>
              <Text style={styles.name}>{profile.name}</Text>
              <Text style={styles.ageDot}>•</Text>
              <Text style={styles.age}>{profile.age}</Text>
              <View style={styles.tagsRow}>
                {profile.tags.map((t) => (
                  <View key={t} style={styles.cardTag}>
                    <Text style={styles.cardTagText}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>

            {profile.location ? (
              <Text style={styles.locationText}>{profile.location}</Text>
            ) : null}

            <View style={styles.metricsContainer}>
              <Metric label="Activity" fill="#FF6B6B" percent={activity} />
              <Metric label="Banter" fill="#5BC0F8" percent={banter} />
              <Metric label="Ghost" fill="#9B59B6" percent={ghost} />
            </View>
          </View>
        </BlurView>
      </View>
    </Animated.View>
  );
}

function Metric({ label, fill, percent }) {
  const hasValue = percent !== null && percent !== undefined;
  const displayPercent = hasValue ? Math.round(Number(percent) * 100) : null;

  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricBar}>
        {hasValue ? (
          <View style={[styles.metricBarFill, { backgroundColor: fill, width: `${displayPercent}%` }]} />
        ) : null}
      </View>
      <Text style={styles.metricValue}>{hasValue ? `${displayPercent}%` : '–'}</Text>
    </View>
  );
}

function SubtleSpark({ delay = 0 }) {
  const ty = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(op, {
          toValue: 0.4,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.parallel([
          Animated.timing(ty, {
            toValue: -CARD_H * 0.4,
            duration: 4000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(op, {
            toValue: 0,
            duration: 4000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
        ]),
        Animated.timing(ty, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay]);

  const size = 2 + Math.random() * 2;
  const left = 30 + Math.random() * (CARD_W - 60);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 40,
        left,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(91,192,248,0.9)',
        opacity: op,
        transform: [{ translateY: ty }],
      }}
    />
  );
}

const styles = StyleSheet.create({
  filterTag: {
    position: 'absolute',
    left: 20,
    zIndex: 1200,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(6,57,112,0.18)',
    shadowColor: '#5BC0F8',
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  filterTagText: {
    color: '#063970',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.25,
    textTransform: 'capitalize',
  },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(6, 12, 24, 0.35)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  filterModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  filterTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#063970',
    textTransform: 'capitalize',
  },
  filterSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#4F5D75',
  },
  filterScroll: {
    maxHeight: 420,
    marginTop: 16,
  },
  filterContent: {
    paddingBottom: 16,
    gap: 20,
  },
  filterSection: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#063970',
    textTransform: 'capitalize',
  },
  sectionHint: {
    fontSize: 13,
    color: '#6B7D90',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  interestChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  chipActive: {
    borderColor: '#5BC0F8',
    backgroundColor: 'rgba(91,192,248,0.12)',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F5D75',
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: '#063970',
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ageField: {
    flex: 1,
  },
  ageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7D90',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  ageInputWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FBFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 40,
    width: '100%',
  },
  ageInputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  ageInputText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#063970',
    textAlign: 'center',
  },
  ageInputIcon: {
    marginLeft: 6,
  },
  ageInputPlaceholder: {
    color: '#8EA1B8',
    fontWeight: '400',
  },
  ageInputContainer: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FBFF',
    minHeight: 40,
    width: '100%',
    overflow: 'hidden',
  },
  ageInputInner: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 40,
    width: '100%',
    fontSize: 16,
    fontWeight: '600',
    color: '#063970',
    textAlign: 'center',
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  ageInput: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FBFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 40,
    width: '100%',
    fontSize: 16,
    fontWeight: '600',
    color: '#063970',
    textAlign: 'center',
  },
  locationInputWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FBFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationInputText: {
    fontSize: 15,
    color: '#063970',
    flex: 1,
  },
  locationInputIcon: {
    marginLeft: 'auto',
  },
  locationInputPlaceholder: {
    color: '#8EA1B8',
  },
  locationInput: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FBFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 44,
    fontSize: 15,
    color: '#063970',
    width: '100%',
  },
  agePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  agePickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  agePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E6ED',
  },
  agePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#063970',
  },
  agePickerCloseButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  agePickerCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  agePickerScrollView: {
    maxHeight: 400,
  },
  agePickerScrollContent: {
    paddingVertical: 10,
  },
  agePickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  agePickerOptionSelected: {
    backgroundColor: '#E8F6FF',
  },
  agePickerOptionDisabled: {
    opacity: 0.3,
  },
  agePickerOptionText: {
    fontSize: 16,
    color: '#063970',
    textAlign: 'center',
  },
  agePickerOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '700',
  },
  agePickerOptionTextDisabled: {
    color: '#8EA1B8',
  },
  locationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  locationModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  locationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E6ED',
  },
  locationModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#063970',
  },
  locationModalCloseButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  locationModalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  locationModalInputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  locationModalInputWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FBFF',
    overflow: 'hidden',
  },
  locationModalInput: {
    borderWidth: 0,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#063970',
    backgroundColor: '#F8FBFF',
  },
  locationModalSaveButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  locationModalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ageSeparator: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7D90',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    gap: 14,
  },
  resetButton: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4F5D75',
  },
  applyButton: {
    flex: 1.4,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5BC0F8',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  container: { flex: 1, backgroundColor: '#E8F6FF' },
  deckContainer: { flex: 1, justifyContent: 'flex-start', alignItems: 'center', paddingHorizontal: SIDE_PADDING, paddingBottom: 30 },
  cardWrapper: { position: 'absolute', width: CARD_W, height: CARD_H },
  cardContainer: { width: '100%', height: '100%' },
  cardClip: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colours.hairline,
  },
  cardImg: { width: '100%', height: CARD_H, position: 'absolute' },
  overlayWarm: { ...StyleSheet.absoluteFillObject, backgroundColor: colours.warmTint },
  infoWrap: { position: 'absolute', left: 14, right: 14, bottom: 14, borderRadius: 20, overflow: 'hidden' },
  glass: { borderRadius: 20, backgroundColor: colours.glassTint, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.3)' },
  infoInner: { paddingHorizontal: 16, paddingVertical: 10 },
  infoHeaderRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  name: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', textTransform: 'capitalize' },
  ageDot: { marginHorizontal: 4, color: '#FFFFFF', fontSize: 18 },
  age: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  tagsRow: { flexDirection: 'row', marginLeft: 8 },
  locationText: { color: '#FFFFFF', fontSize: 14, marginTop: 6 },
  cardTag: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginLeft: 4 },
  cardTagText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  metricsContainer: { marginTop: 6 },
  metricRow: { marginBottom: 6 },
  metricLabel: { color: '#FFFFFF', fontSize: 12, marginBottom: 3 },
  metricBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 6 },
  metricBarFill: { height: 6, borderRadius: 6 },
  metricValue: { color: '#FFFFFF', fontSize: 12, marginTop: 3 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#32465A',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7D90',
    textAlign: 'center',
    marginTop: 8,
  },
  actionBar: { position: 'absolute', left: 0, right: 0, bottom: 42, paddingHorizontal: 40, flexDirection: 'row', justifyContent: 'space-around', zIndex: 2000 },
  actionButtonLarge: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#5BC0F8', fontWeight: '600' },
});
