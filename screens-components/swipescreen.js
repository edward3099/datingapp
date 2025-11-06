import React, { useMemo, useRef, useState, useEffect } from 'react'
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
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { AntDesign } from '@expo/vector-icons'

const { width: SCREEN_W } = Dimensions.get('window')

const MAX_CARD_W = 420
const SIDE_PADDING = 24
const CARD_W = Math.min(SCREEN_W - SIDE_PADDING, MAX_CARD_W)
const CARD_H = Math.max(560, Math.min(720, Math.round(CARD_W * 1.55)))
const CARD_TOP_OFFSET = 40

const SWIPE_DISTANCE = 140
const SWIPE_VELOCITY = 0.22

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

const initialDeck = [
  { id: '1', name: 'amara', age: 24, imageUri: require('./assets/angel.png'), tags: ['design', 'poetry'] },
  { id: '2', name: 'nate', age: 27, imageUri: require('./assets/devil-Photoroom.png'), tags: ['climb', 'film'] },
  { id: '3', name: 'luna', age: 26, imageUri: require('./assets/angel.png'), tags: ['music', 'travel'] },
  { id: '4', name: 'jules', age: 29, imageUri: require('./assets/devil-Photoroom.png'), tags: ['code', 'coffee'] },
  { id: '5', name: 'kai', age: 23, imageUri: require('./assets/angel.png'), tags: ['art', 'skate'] },
]

export default function SwipeScreen() {
  const [deck, setDeck] = useState(initialDeck)
  const visible = useMemo(() => deck.slice(0, 3), [deck])

  const pan = useRef(new Animated.ValueXY()).current
  const isAnimating = useRef(false)

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
      Animated.timing(v, { toValue: 0.94, duration: 80, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(v, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }),
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
      Animated.timing(toastAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setToastText(null)
      setTimeout(playNextToast, 40)
    })
  }

  const [consecutiveDislikes, setConsecutiveDislikes] = useState(0)
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

  const flingOff = (dir, done) => {
    Animated.timing(pan, {
      toValue: { x: dir * (SCREEN_W + 240), y: 0 },
      duration: 360,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      pan.setValue({ x: 0, y: 0 })
      if (done) done()
    })
  }

  const commitSwipe = (type) => {
    if (isAnimating.current) return
    isAnimating.current = true

    if (type === 'like') {
      setConsecutiveDislikes(0)
      enqueueToast(pick(LIKE_FEEDBACK))
    } else {
      const next = consecutiveDislikes + 1
      setConsecutiveDislikes(next)
      enqueueToast(next >= 3 ? TIP_DISLIKES_3 : pick(PASS_FEEDBACK))
      if (next >= 3) setConsecutiveDislikes(0)
    }

    const dir = type === 'like' ? 1 : -1
    flingOff(dir, () => {
      setDeck((prev) => prev.slice(1))
      requestAnimationFrame(() => (isAnimating.current = false))
    })
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isAnimating.current,
      onMoveShouldSetPanResponder: (evt, g) => !isAnimating.current && (Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6),
      onPanResponderMove: (evt, gesture) => {
        if (isAnimating.current) return
        Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })(evt, gesture)
      },
      onPanResponderRelease: (e, g) => {
        if (isAnimating.current) return
        const intent = Math.abs(g.dx) > SWIPE_DISTANCE || (Math.abs(g.vx) > SWIPE_VELOCITY && Math.abs(g.dx) > 60)
        if (intent) commitSwipe(g.dx > 0 ? 'like' : 'dislike')
        else Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true, speed: 16, bounciness: 7 }).start()
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current

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

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#E8F6FF', '#F3FAFF']} style={StyleSheet.absoluteFill} />

      <View style={styles.deckContainer} pointerEvents="box-none">
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
                <Animated.View
                  {...(isTop ? panResponder.panHandlers : {})}
                  style={
                    isTop
                      ? { ...styles.cardContainer, transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotateZ }, { perspective: 1000 }, { rotateX: tiltX }, { rotateY: tiltY }] }
                      : { ...styles.cardContainer, transform: [{ translateY }, { translateX }, { scale }, { rotate: rotZ }] }
                  }
                >
                  <Card profile={profile} isTop={isTop} pan={isTop ? pan : null} />
                </Animated.View>
              </View>
            )
          })
        ) : (
          <Text style={styles.emptyText}>no more profiles!</Text>
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
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    if (isTop) loop.start();
    return () => loop.stop();
  }, [isTop]);

  const breatheScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.01] });
  const breatheShadow = breathe.interpolate({ inputRange: [0, 1], outputRange: [12, 20] });

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
      <Image source={profile.imageUri} style={styles.cardImg} resizeMode="cover" />
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

            <View style={styles.metricsContainer}>
              <Metric label="Red Flag" fill="#FF6B6B" percent={35} />
              <Metric label="Banter" fill="#5BC0F8" percent={80} />
              <Metric label="Ghost" fill="#9B59B6" percent={45} />
            </View>
          </View>
        </BlurView>
      </View>
    </Animated.View>
  );
}

function Metric({ label, fill, percent }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricBar}>
        <View style={[styles.metricBarFill, { backgroundColor: fill, width: `${percent}%` }]} />
      </View>
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
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(ty, {
            toValue: -CARD_H * 0.4,
            duration: 4000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(op, {
            toValue: 0,
            duration: 4000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(ty, { toValue: 0, duration: 0, useNativeDriver: true }),
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
  container: { flex: 1, backgroundColor: '#E8F6FF' },
  deckContainer: { flex: 1, justifyContent: 'flex-start', alignItems: 'center', paddingHorizontal: SIDE_PADDING, paddingBottom: 180 },
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
  cardTag: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginLeft: 4 },
  cardTagText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  metricsContainer: { marginTop: 6 },
  metricRow: { marginBottom: 6 },
  metricLabel: { color: '#FFFFFF', fontSize: 12, marginBottom: 3 },
  metricBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 6 },
  metricBarFill: { height: 6, borderRadius: 6 },
  emptyText: { fontSize: 22, color: '#777' },
  actionBar: { position: 'absolute', left: 0, right: 0, bottom: 42, paddingHorizontal: 40, flexDirection: 'row', justifyContent: 'space-around', zIndex: 2000 },
  actionButtonLarge: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center' },
});
