import React, { useRef, useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Dimensions,
  Pressable,
  Animated,
  Easing,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

const { width } = Dimensions.get('window')

export default function Onboarding() {
  const [index, setIndex] = useState(0)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState([])
  const [sparkles, setSparkles] = useState([])

  const fadeAnim = useRef(new Animated.Value(1)).current
  const slideAnim = useRef(new Animated.Value(0)).current
  const bgAnim = useRef(new Animated.Value(0)).current
  const nextPulse = useRef(new Animated.Value(1)).current
  const progressAnim = useRef(new Animated.Value(0)).current

  const slides = [
    { title: 'welcome to emote', subtitle: 'let’s begin your journey' },
    { title: 'your name', subtitle: 'tell us what to call you' },
    { title: 'age & gender', subtitle: 'just to personalise things' },
    { title: 'bio & interests', subtitle: 'let others know your vibe' },
    { title: 'ready to start?', subtitle: 'review and continue' },
  ]

  const totalSlides = slides.length

  const nextSlide = () => {
    Animated.sequence([
      Animated.spring(nextPulse, { toValue: 0.9, useNativeDriver: true }),
      Animated.spring(nextPulse, { toValue: 1, useNativeDriver: true }),
    ]).start()

    if (index < totalSlides - 1) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -40, duration: 250, useNativeDriver: true }),
        Animated.timing(bgAnim, { toValue: (index + 1) / (totalSlides - 1), duration: 600, useNativeDriver: false }),
        Animated.timing(progressAnim, { toValue: (index + 1) / (totalSlides - 1), duration: 600, useNativeDriver: false }),
      ]).start(() => {
        setIndex((prev) => prev + 1)
        fadeAnim.setValue(0)
        slideAnim.setValue(40)
        Animated.parallel([
          Animated.spring(fadeAnim, { toValue: 1, useNativeDriver: true }),
          Animated.spring(slideAnim, { toValue: 0, friction: 6, tension: 70, useNativeDriver: true }),
        ]).start()
      })
    }
  }

  const interpolateColors = bgAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['#E8F6FF', '#F5E6FF', '#FFE6EE', '#E8F6FF', '#E0F7FA'],
  })

  const handleInterestToggle = (interest) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    )
  }

  const interestsList = [
    'music', 'art', 'travel', 'sports', 'tech',
    'books', 'fashion', 'pets', 'film', 'fitness',
  ]

  useEffect(() => {
    let interval
    if (interests.length > 0) {
      interval = setInterval(() => {
        const sparkle = {
          id: Date.now(),
          left: Math.random() * width * 0.9,
          size: 2 + Math.random() * 3,
          duration: 2000 + Math.random() * 2000,
        }
        setSparkles((prev) => [...prev, sparkle])
        setTimeout(() => {
          setSparkles((prev) => prev.filter((s) => s.id !== sparkle.id))
        }, sparkle.duration)
      }, 600)
    }
    return () => clearInterval(interval)
  }, [interests])

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <LinearGradient colors={[interpolateColors, '#FFFFFF']} style={styles.container}>
        {sparkles.map((s) => (
          <Sparkle key={s.id} left={s.left} size={s.size} duration={s.duration} />
        ))}

        <Animated.View style={[styles.slide, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.title}>{slides[index].title}</Text>
          <Text style={styles.subtitle}>{slides[index].subtitle}</Text>

          {index === 1 && (
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="enter your name"
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholderTextColor="#8EA1B8"
              />
            </View>
          )}

          {index === 2 && (
            <View style={{ width: '100%', alignItems: 'center' }}>
              <TextInput
                placeholder="age"
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
                style={styles.input}
                placeholderTextColor="#8EA1B8"
              />
              <View style={styles.genderRow}>
                {['male', 'female', 'other'].map((g) => (
                  <Pressable key={g} onPress={() => setGender(g)} style={[styles.genderButton, gender === g && styles.genderSelected]}>
                    <Text style={[styles.genderText, gender === g && { color: '#fff' }]}>{g}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {index === 3 && (
            <View style={styles.bioContainer}>
              <TextInput
                placeholder="write a short bio..."
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                style={[styles.input, styles.bioInput]}
                placeholderTextColor="#8EA1B8"
              />
              <View style={styles.tagsContainer}>
                {interestsList.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => handleInterestToggle(t)}
                    style={[styles.tag, interests.includes(t) && styles.tagSelected]}
                  >
                    <Text style={[styles.tagText, interests.includes(t) && { color: '#fff' }]}>{t}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {index === 4 && (
            <View style={styles.summary}>
              <Text style={styles.summaryText}>name: {name || '-'}</Text>
              <Text style={styles.summaryText}>age: {age || '-'}</Text>
              <Text style={styles.summaryText}>gender: {gender || '-'}</Text>
              <Text style={styles.summaryText}>bio: {bio || '-'}</Text>
              <Text style={styles.summaryText}>interests: {interests.join(', ') || '-'}</Text>
            </View>
          )}

          <Pressable onPress={nextSlide} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
            <Animated.View style={[styles.nextButton, { transform: [{ scale: nextPulse }] }]}>
              <Text style={styles.nextText}>{index === slides.length - 1 ? 'continue' : 'next'}</Text>
            </Animated.View>
          </Pressable>

          {/* Progress Bar */}
          <View style={styles.progressBarBackground}>
            <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
          </View>
        </Animated.View>
      </LinearGradient>
    </TouchableWithoutFeedback>
  )
}

function Sparkle({ left, size, duration }) {
  const translateY = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -150,
        duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 0,
        left,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(91,192,248,0.7)',
        opacity,
        transform: [{ translateY }],
      }}
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  slide: { width: width * 0.85, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#063970',
    textAlign: 'center',
    marginBottom: 10,
    textTransform: 'capitalize',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#4F5D75',
    marginBottom: 30,
  },
  inputContainer: { width: '100%', alignItems: 'center' },
  input: {
    width: '80%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    padding: 12,
    fontSize: 16,
    color: '#063970',
    textAlign: 'center',
    marginVertical: 10,
  },
  bioInput: { textAlignVertical: 'top', height: 90 },
  genderRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  genderButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 8,
  },
  genderSelected: { backgroundColor: '#007AFF' },
  genderText: { fontSize: 16, color: '#063970' },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
  },
  tag: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    margin: 6,
  },
  tagSelected: { backgroundColor: '#007AFF' },
  tagText: { color: '#063970', fontSize: 15, fontWeight: '600' },
  bioContainer: { width: '100%', alignItems: 'center' },
  summary: { marginTop: 10, alignItems: 'center' },
  summaryText: { fontSize: 16, color: '#063970', marginVertical: 3 },
  nextButton: {
    marginTop: 50,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 25,
    shadowColor: '#007AFF',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  nextText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  progressBarBackground: {
    width: '80%',
    height: 6,
    backgroundColor: '#D9E3F0',
    borderRadius: 3,
    marginTop: 30,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
})
