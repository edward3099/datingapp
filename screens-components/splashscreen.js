import React, { useRef, useEffect } from 'react'

import {
  Text,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  PanResponder,
  Dimensions,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'

const { width, height } = Dimensions.get('window')

export default function SplashScreen() {
  const navigation = useNavigation()
  const tiltX = useRef(new Animated.Value(0)).current
  const tiltY = useRef(new Animated.Value(0)).current
  const fade = useRef(new Animated.Value(0)).current
  const btnScale = useRef(new Animated.Value(1)).current
  const btnColor = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 900, useNativeDriver: true }).start()
  }, [fade])

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => {
        const x = Math.max(-20, Math.min(20, g.dx / 6))
        const y = Math.max(-20, Math.min(20, g.dy / 6))
        tiltX.setValue(x)
        tiltY.setValue(y)
      },
      onPanResponderRelease: () => {
        Animated.parallel([
          Animated.spring(tiltX, { toValue: 0, useNativeDriver: true }),
          Animated.spring(tiltY, { toValue: 0, useNativeDriver: true }),
        ]).start()
      },
    })
  ).current

  const bgColor = btnColor.interpolate({
    inputRange: [0, 1],
    outputRange: ['#007AFF', '#FF4C4C'],
  })

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 0.9, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
    ]).start(() => navigation && navigation.navigate('LoginSignUp'))
  }

  const sparkles = useRef(
    Array.from({ length: 50 }).map(() => ({
      left: Math.random() * width,
      baseY: Math.random() * height * 0.3,
      size: 2 + Math.random() * 3,
      delay: Math.random() * 4000,
      duration: 3000 + Math.random() * 4000,
      drift: (Math.random() - 0.5) * 60,
    }))
  ).current

  return (
    <Animated.View style={[styles.container, { opacity: fade }]} {...pan.panHandlers}>
      <LinearGradient
        colors={['#BFEFFF', '#E9FAFF']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View
        style={[
          styles.depthFog,
          {
            transform: [
              { translateX: Animated.multiply(tiltX, -0.2) },
              { translateY: Animated.multiply(tiltY, -0.2) },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.depthFog2,
          {
            transform: [
              { translateX: Animated.multiply(tiltX, 0.3) },
              { translateY: Animated.multiply(tiltY, 0.3) },
            ],
          },
        ]}
      />

      {sparkles.map((s, i) => (
        <Sparkle key={i} {...s} />
      ))}

      <Text style={styles.title}>amour</Text>
      <Text style={styles.subtitle}>find your vibe</Text>

      <TouchableWithoutFeedback
        onPressIn={() => {
          Animated.timing(btnColor, { toValue: 1, duration: 250, useNativeDriver: false }).start()
        }}
        onPressOut={() => {
          Animated.timing(btnColor, { toValue: 0, duration: 300, useNativeDriver: false }).start()
          handlePress()
        }}
      >
        <Animated.View
          style={[
            styles.button,
            {
              transform: [{ scale: btnScale }],
              backgroundColor: bgColor,
              shadowColor: 'rgba(0,122,255,0.5)',
              shadowOpacity: 0.7,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 4 },
            },
          ]}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Animated.View>
  )
}

function Sparkle({ left, baseY, size, delay, duration, drift }) {
  const fall = useRef(new Animated.Value(0)).current
  const op = useRef(new Animated.Value(0.8)).current
  const driftX = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(fall, { toValue: height * 1.1, duration, useNativeDriver: true }),
          Animated.timing(op, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(driftX, { toValue: drift, duration, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(op, { toValue: 0, duration: 600, useNativeDriver: true }),
          Animated.timing(fall, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(driftX, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [delay, duration, fall, op, driftX, drift])

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: baseY,
        left,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(255,255,255,0.8)',
        opacity: op,
        transform: [{ translateY: fall }, { translateX: driftX }],
      }}
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  depthFog: {
    position: 'absolute',
    width: width * 1.4,
    height: height * 0.7,
    top: height * 0.25,
    backgroundColor: '#A7E2FF',
    opacity: 0.08,
    borderRadius: 1000,
  },
  depthFog2: {
    position: 'absolute',
    width: width * 1.1,
    height: height * 0.9,
    top: height * 0.1,
    backgroundColor: '#D4F4FF',
    opacity: 0.06,
    borderRadius: 1000,
  },
  title: { fontSize: 46, fontWeight: '800', color: '#063970', marginTop: 30 },
  subtitle: { fontSize: 18, color: '#3E5A73', marginTop: 8 },
  button: {
    marginTop: 60,
    paddingVertical: 18,
    paddingHorizontal: 70,
    borderRadius: 40,
  },
  buttonText: { fontSize: 20, fontWeight: '700', color: 'white' },
})
