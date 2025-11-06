import React, { useRef, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  ScrollView,
  Dimensions,
  Easing,
  Pressable,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { AntDesign } from '@expo/vector-icons'
import TopNavBar from '../components/TopNavBar'

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_W = SCREEN_W * 0.94
const CARD_H = CARD_W * 1.35

export default function ViewProfileScreen() {
  const likeScale = useRef(new Animated.Value(1)).current
  const dislikeScale = useRef(new Animated.Value(1)).current
  const [liked, setLiked] = useState(false)
  const [passed, setPassed] = useState(false)
  const cardShake = useRef(new Animated.Value(0)).current

  const likeTagOpacity = useRef(new Animated.Value(0)).current
  const likeTagTranslate = useRef(new Animated.Value(-10)).current
  const likeGlow = useRef(new Animated.Value(0)).current

  const passTagOpacity = useRef(new Animated.Value(0)).current
  const passTagTranslate = useRef(new Animated.Value(-10)).current
  const passGlow = useRef(new Animated.Value(0)).current

  const redFlagValue = useRef(new Animated.Value(0)).current
  const banterValue = useRef(new Animated.Value(0)).current
  const ghostValue = useRef(new Animated.Value(0)).current
  const redGlow = useRef(new Animated.Value(0)).current
  const banterGlow = useRef(new Animated.Value(0)).current
  const ghostGlow = useRef(new Animated.Value(0)).current

  const [redPercent, setRedPercent] = useState(0)
  const [banterPercent, setBanterPercent] = useState(0)
  const [ghostPercent, setGhostPercent] = useState(0)

  useEffect(() => {
    const animateMetric = (valueRef, glowRef, target, setPercent) => {
      Animated.parallel([
        Animated.timing(valueRef, {
          toValue: target,
          duration: 2500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowRef, { toValue: 1, duration: 800, useNativeDriver: false }),
            Animated.timing(glowRef, { toValue: 0, duration: 800, useNativeDriver: false }),
          ]),
          { iterations: 2 }
        ),
      ]).start()

      let start = 0
      const step = target / 80
      const interval = setInterval(() => {
        start += step
        if (start >= target) {
          start = target
          clearInterval(interval)
        }
        setPercent(Math.round(start * 100))
      }, 35)
    }

    animateMetric(redFlagValue, redGlow, 0.21, setRedPercent)
    animateMetric(banterValue, banterGlow, 0.84, setBanterPercent)
    animateMetric(ghostValue, ghostGlow, 0.32, setGhostPercent)
  }, [])

  const shakeCard = () => {
    cardShake.setValue(0)
    Animated.sequence([
      Animated.timing(cardShake, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(cardShake, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(cardShake, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(cardShake, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(cardShake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start()
  }

  const handleLike = () => {
    setLiked(true)
    setPassed(false)
    shakeCard()
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.25, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 1, useNativeDriver: true }),
    ]).start()
    Animated.parallel([
      Animated.timing(likeTagOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(likeTagTranslate, { toValue: 0, useNativeDriver: true }),
    ]).start()
  }

  const handleDislike = () => {
    setPassed(true)
    setLiked(false)
    shakeCard()
    Animated.sequence([
      Animated.spring(dislikeScale, { toValue: 1.2, useNativeDriver: true }),
      Animated.spring(dislikeScale, { toValue: 1, useNativeDriver: true }),
    ]).start()
    Animated.parallel([
      Animated.timing(passTagOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(passTagTranslate, { toValue: 0, useNativeDriver: true }),
    ]).start()
  }

  const glowColor = likeGlow.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ffb3b3', '#ff5a5a'],
  })
  const passGlowColor = passGlow.interpolate({
    inputRange: [0, 1],
    outputRange: ['#d0a3ff', '#A020F0'],
  })

  const MetricBar = ({ label, color, value, glow, percent }) => {
    const width = value.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    })
    const shadow = glow.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(0,0,0,0)', color + '99'],
    })
    return (
      <View style={styles.metricItem}>
        <View style={styles.metricHeader}>
          <Text style={styles.metricLabel}>{label}</Text>
          <Text style={[styles.metricValue, { color }]}>{percent}%</Text>
        </View>
        <View style={styles.metricBarBackground}>
          <Animated.View
            style={[
              styles.metricBarFill,
              {
                backgroundColor: color,
                width,
                shadowColor: shadow,
                shadowOpacity: 0.7,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 0 },
              },
            ]}
          />
        </View>
      </View>
    )
  }

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
        contentContainerStyle={{ alignItems: 'center', paddingTop: 110, paddingBottom: 180 }}
      >
        <Animated.View style={[styles.heroContainer, { transform: [{ translateX: cardShake }] }]}>
          <Image source={{ uri: 'https://picsum.photos/1000/1200' }} style={styles.heroImage} />
          <LinearGradient colors={['transparent', 'rgba(255,255,255,0.9)']} style={styles.heroFade} />

          {liked && (
            <Animated.View
              style={[
                styles.likeTagContainer,
                {
                  opacity: likeTagOpacity,
                  transform: [{ translateY: likeTagTranslate }],
                  backgroundColor: glowColor,
                },
              ]}
            >
              <Text style={styles.likeTagText}>LIKE</Text>
            </Animated.View>
          )}

          {passed && (
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
          )}
        </Animated.View>

        <View style={styles.content}>
          <Text style={styles.name}>Amara, 24</Text>
          <Text style={styles.bio}>
            designer & poet. lover of soft colours, old bookstores, and rainy mornings.
          </Text>

          <View style={styles.metricsContainer}>
            <MetricBar label="Red Flag" color="#FF4444" value={redFlagValue} glow={redGlow} percent={redPercent} />
            <MetricBar label="Banter" color="#00C851" value={banterValue} glow={banterGlow} percent={banterPercent} />
            <MetricBar label="Ghost" color="#5BC0F8" value={ghostValue} glow={ghostGlow} percent={ghostPercent} />
          </View>
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6FAFF' },
  heroContainer: {
    marginTop: 70,
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
  likeTagContainer: { position: 'absolute', top: 20, right: 20, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8 },
  likeTagText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  passTagContainer: { position: 'absolute', top: 20, left: 20, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8 },
  passTagText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  content: { width: CARD_W, marginTop: 30 },
  name: { fontSize: 32, fontWeight: '800', color: '#063970', marginBottom: 6 },
  bio: { fontSize: 16, color: '#5C738A', lineHeight: 22, marginBottom: 20 },
  metricsContainer: { marginTop: 10 },
  metricItem: { marginBottom: 16 },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  metricLabel: { fontSize: 14, color: '#063970', fontWeight: '600' },
  metricValue: { fontSize: 14, fontWeight: '700' },
  metricBarBackground: {
    height: 10,
    backgroundColor: '#E0E6ED',
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  metricBarFill: {
    height: 10,
    borderRadius: 10,
  },
  actionBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  actionButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
})
