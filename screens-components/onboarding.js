import React, { useRef, useState, useEffect, useMemo } from 'react'
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
  Alert,
  Modal,
  ScrollView,
  Linking,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { profileService } from '../services/profileService'
import { logger } from '../utils/logger'
import Checkbox from 'expo-checkbox'

const { width } = Dimensions.get('window')

const LOCATION_OPTIONS = [
  { country: 'United States', cities: ['New York', 'Los Angeles', 'Austin', 'Chicago', 'Miami'] },
  { country: 'Canada', cities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa'] },
  { country: 'United Kingdom', cities: ['London', 'Manchester', 'Liverpool', 'Edinburgh', 'Bristol'] },
  { country: 'Australia', cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'] },
  { country: 'Germany', cities: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'] },
]

const formatLocation = (value = '') =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) =>
      part
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    )
    .join(', ')

const parseLocation = (value = '') => {
  if (!value) return { city: '', country: '' }
  const [cityRaw = '', countryRaw = ''] = value.split(',')
  return {
    city: formatLocation(cityRaw),
    country: formatLocation(countryRaw),
  }
}

export default function Onboarding() {
  const navigation = useNavigation()
  const { profile: authProfile, updateProfile: updateProfileContext, refreshProfile } = useAuth()
  const [index, setIndex] = useState(0)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [countryModalVisible, setCountryModalVisible] = useState(false)
  const [cityModalVisible, setCityModalVisible] = useState(false)
  const [interests, setInterests] = useState([])
  const [sparkles, setSparkles] = useState([])
  const [validationError, setValidationError] = useState('')
  const [saving, setSaving] = useState(false)
  const [tagSelectorVisible, setTagSelectorVisible] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsModalVisible, setTermsModalVisible] = useState(false)

  const prefillApplied = useRef(false)

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
    { title: 'one last step', subtitle: 'accept our terms to continue' },
  ]

  const totalSlides = slides.length

  const backgroundColor = bgAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['#E8F6FF', '#F5E6FF', '#FFE6EE', '#E8F6FF', '#E0F7FA'],
  })

  useEffect(() => {
    if (!authProfile || prefillApplied.current) return

    const existingName = authProfile.display_name || authProfile.first_name || ''
    const existingAge = authProfile.age ? String(authProfile.age) : ''
    const existingBio = authProfile.bio || ''
    const existingGender = authProfile.gender || authProfile.gender_identity || ''
    const existingTags = Array.isArray(authProfile.tags)
      ? authProfile.tags
          .map((tag) => (typeof tag === 'string' ? tag.trim().toLowerCase() : ''))
          .filter(Boolean)
      : []

    if (existingName) setName(existingName)
    if (existingAge) setAge(existingAge)
    if (existingBio) setBio(existingBio)
    if (existingGender) setGender(existingGender)
    if (existingTags.length) setInterests(existingTags)
    if (authProfile?.location) {
      const { city: parsedCity, country: parsedCountry } = parseLocation(authProfile.location)
      if (parsedCountry) setSelectedCountry(parsedCountry)
      if (parsedCity) setSelectedCity(parsedCity)
      setLocation(formatLocation(authProfile.location))
    }

    prefillApplied.current = true
  }, [authProfile])

  useEffect(() => {
    if (selectedCountry && selectedCity) {
      setLocation(formatLocation(`${selectedCity}, ${selectedCountry}`))
    } else {
      setLocation('')
    }
  }, [selectedCountry, selectedCity])

  useEffect(() => {
    let interval
    if (interests.length > 0) {
      interval = setInterval(() => {
        const sparkleId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const sparkle = {
          id: sparkleId,
          left: Math.random() * width * 0.9,
          size: 2 + Math.random() * 3,
          duration: 2000 + Math.random() * 2000,
        }
        setSparkles((prev) => [...prev, sparkle])
        setTimeout(() => {
          setSparkles((prev) => prev.filter((s) => s.id !== sparkleId))
        }, sparkle.duration)
      }, 600)
    }
    return () => clearInterval(interval)
  }, [interests])

  const MAX_INTERESTS = 2

  const citiesForSelectedCountry = useMemo(() => {
    const match = LOCATION_OPTIONS.find(({ country }) => country === selectedCountry)
    return match ? match.cities : []
  }, [selectedCountry])

  const getValidationMessage = (step = index) => {
    const trimmedName = name.trim()
    const parsedAge = parseInt(age, 10)
    const normalizedBio = bio.trim()
    const hasValidAge = !Number.isNaN(parsedAge) && parsedAge > 0
    const hasSufficientAge = hasValidAge && parsedAge >= 18
    const hasInterests = interests.some((interest) => interest && interest.trim().length > 0)
    const hasLocationSelection = selectedCountry && selectedCity

    if (step === 1) {
      if (!trimmedName) return 'Please enter your name to continue.'
      if (trimmedName.length < 2) return 'Your name should be at least 2 characters.'
    }
    if (step === 2) {
      if (!hasValidAge) return 'Please enter a valid age.'
      if (!hasSufficientAge) return 'You must be at least 18 years old to continue.'
      if (!gender) return 'Select the gender you identify with.'
    }
    if (step === 3) {
      if (!normalizedBio) return 'Share a short bio so matches can get to know you.'
      if (normalizedBio.length < 20) return 'Your bio should be at least 20 characters.'
      if (!hasLocationSelection) return 'Select your city and country.'
      if (!hasInterests) return 'Pick at least one interest to continue.'
      if (interests.length > MAX_INTERESTS) return `Choose up to ${MAX_INTERESTS} interests.`
    }
    if (step === 4) {
      if (!trimmedName || !hasSufficientAge || !gender || !normalizedBio || !hasLocationSelection || !hasInterests) {
        return 'Looks like something is missing above—please review your info.'
      }
      if (interests.length > MAX_INTERESTS) return `Choose up to ${MAX_INTERESTS} interests.`
    }
    if (step === 5) {
      if (!termsAccepted) return 'Please review and accept the Terms of Use / EULA to continue.'
    }
    return ''
  }

  const currentValidationMessage = getValidationMessage(index)
  const nextDisabled = saving || (index !== 0 && !!currentValidationMessage)

  const pulseButton = (target = 0.9, onComplete) => {
    Animated.sequence([
      Animated.spring(nextPulse, { toValue: target, useNativeDriver: false }),
      Animated.spring(nextPulse, { toValue: 1, useNativeDriver: false }),
    ]).start(() => {
      if (typeof onComplete === 'function') {
        onComplete()
      }
    })
  }

  const advanceSlide = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: false }),
      Animated.timing(slideAnim, { toValue: -40, duration: 250, useNativeDriver: false }),
      Animated.timing(bgAnim, {
        toValue: (index + 1) / (totalSlides - 1),
        duration: 600,
        useNativeDriver: false,
      }),
      Animated.timing(progressAnim, {
        toValue: (index + 1) / (totalSlides - 1),
        duration: 600,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setIndex((prev) => prev + 1)
      fadeAnim.setValue(0)
      slideAnim.setValue(40)
      Animated.parallel([
        Animated.spring(fadeAnim, { toValue: 1, useNativeDriver: false }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 6,
          tension: 70,
          useNativeDriver: false,
        }),
      ]).start()
    })
  }

  const completeOnboarding = async () => {
    if (!termsAccepted) {
      setValidationError('Please review and accept the Terms of Use / EULA to continue.')
      return
    }

    setSaving(true)

    const trimmedName = name.trim()
    const normalizedBio = bio.trim()
    const parsedAge = parseInt(age, 10)
    const ageValue = Number.isNaN(parsedAge) ? null : parsedAge
    const normalizedInterests = Array.from(
      new Set(
        interests
          .map((interest) => (typeof interest === 'string' ? interest.trim().toLowerCase() : ''))
          .filter(Boolean)
      )
    )

    try {
      const updates = {
        display_name: trimmedName || null,
        first_name: trimmedName || null,
        age: ageValue,
        bio: normalizedBio || null,
        location:
          selectedCountry && selectedCity
            ? formatLocation(`${selectedCity}, ${selectedCountry}`)
            : null,
        onboarding_state: 'complete',
        tags: normalizedInterests,
      }

      if (authProfile) {
        if (Object.prototype.hasOwnProperty.call(authProfile, 'gender')) {
          updates.gender = gender || null
        } else if (Object.prototype.hasOwnProperty.call(authProfile, 'gender_identity')) {
          updates.gender_identity = gender || null
        }
      }

      const { profile: updatedProfile, error } = await updateProfileContext(updates)
      if (error) throw error

      const { error: interestsError } = await profileService.updateInterests(normalizedInterests)
      if (interestsError) throw interestsError

      await refreshProfile?.()
      if (updatedProfile) {
        prefillApplied.current = false
      }

      navigation.replace('UserProfile')
    } catch (error) {
      logger.error('Onboarding completion failed', {
        error: error?.message || String(error),
        stack: error?.stack,
      })
      Alert.alert('Unable to finish onboarding', 'We could not save your profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleNext = () => {
    if (saving) return

    const message = getValidationMessage(index)
    if (message) {
      setValidationError(message)
      pulseButton(0.92)
      return
    }

    setValidationError('')
    pulseButton(0.9, () => {
      if (index < totalSlides - 1) {
        advanceSlide()
      } else {
        completeOnboarding().catch(() => {})
      }
    })
  }

  const handleNameChange = (value) => {
    setName(value)
    if (validationError) setValidationError('')
  }

  const handleAgeChange = (value) => {
    setAge(value.replace(/[^0-9]/g, '').slice(0, 3))
    if (validationError) setValidationError('')
  }

  const handleGenderSelect = (value) => {
    setGender(value)
    if (validationError) setValidationError('')
  }

  const handleBioChange = (value) => {
    setBio(value)
    if (validationError) setValidationError('')
  }

  const handleCountrySelect = (country) => {
    setSelectedCountry(country)
    setSelectedCity('')
    setCountryModalVisible(false)
    setTimeout(() => setCityModalVisible(true), 120)
    if (validationError) setValidationError('')
  }

  const handleCitySelect = (city) => {
    setSelectedCity(city)
    setCityModalVisible(false)
    if (validationError) setValidationError('')
  }

  const handleInterestToggle = (interest) => {
    const slug = typeof interest === 'string' ? interest.trim().toLowerCase() : ''
    if (!slug) return

    setInterests((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((i) => i !== slug)
      }

      if (prev.length >= MAX_INTERESTS) {
        setValidationError(`You can select at most ${MAX_INTERESTS} interests.`)
        pulseButton(0.92)
        return prev
      }

      return [...prev, slug]
    })
    if (validationError) setValidationError('')
  }

  const interestsList = [
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
      <Animated.View style={[styles.container, { backgroundColor }]}>
        {sparkles.map((s) => (
          <Sparkle key={s.id} left={s.left} size={s.size} duration={s.duration} />
        ))}

        <Animated.View style={[styles.slide, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <Text style={styles.title}>{slides[index].title}</Text>
          <Text style={styles.subtitle}>{slides[index].subtitle}</Text>

          {index === 1 && (
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="enter your name"
                value={name}
                onChangeText={handleNameChange}
                style={styles.input}
                placeholderTextColor="#8EA1B8"
                autoCapitalize="words"
              />
            </View>
          )}

          {index === 2 && (
             <View style={{ width: '100%', alignItems: 'center' }}>
               <TextInput
                 placeholder="age"
                 keyboardType="numeric"
                 value={age}
                 onChangeText={handleAgeChange}
                 style={styles.input}
                 placeholderTextColor="#8EA1B8"
                 maxLength={3}
               />
              <View style={styles.genderTagRow}>
                {['male', 'female', 'other'].map((g) => {
                  const isActive = gender === g
                  return (
                    <Pressable
                      key={g}
                      onPress={() => handleGenderSelect(g)}
                      style={[styles.genderTag, isActive && styles.genderTagActive]}
                    >
                      <Text style={[styles.genderTagText, isActive && styles.genderTagTextActive]}>
                        {g}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
             </View>
           )}

          {index === 3 && (
            <View style={styles.bioContainer}>
              <TextInput
                placeholder="write a short bio..."
                value={bio}
                onChangeText={handleBioChange}
                multiline
                numberOfLines={3}
                style={[styles.input, styles.bioInput]}
                placeholderTextColor="#8EA1B8"
              />
              <View style={styles.locationSelectors}>
                <Pressable
                  style={[styles.locationSelector, !selectedCountry && styles.locationSelectorEmpty]}
                  onPress={() => setCountryModalVisible(true)}
                >
                  <Text style={styles.locationSelectorText}>
                    {selectedCountry || 'Select country'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.locationSelector,
                    !selectedCity && styles.locationSelectorEmpty,
                    !selectedCountry && styles.locationSelectorDisabled,
                  ]}
                  disabled={!selectedCountry}
                  onPress={() => selectedCountry && setCityModalVisible(true)}
                >
                  <Text style={styles.locationSelectorText}>{selectedCity || 'Select city'}</Text>
                </Pressable>
              </View>
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
                {interests.length >= MAX_INTERESTS && (
                  <Text style={styles.tagLimitText}>
                    You can select up to {MAX_INTERESTS} interests.
                  </Text>
                )}
              </View>
            </View>
          )}

          {index === 4 && (
            <View style={styles.summary}>
              <Text style={styles.summaryText}>name: {name || '-'}</Text>
              <Text style={styles.summaryText}>age: {age || '-'}</Text>
              <Text style={styles.summaryText}>gender: {gender || '-'}</Text>
              <Text style={styles.summaryText}>bio: {bio || '-'}</Text>
              <Text style={styles.summaryText}>
                location:{' '}
                {selectedCountry && selectedCity
                  ? formatLocation(`${selectedCity}, ${selectedCountry}`)
                  : '-'}
              </Text>
              <Text style={styles.summaryText}>
                interests:{' '}
                {interests.length
                  ? interests
                      .map((item) =>
                        typeof item === 'string' && item.length
                          ? item.charAt(0).toUpperCase() + item.slice(1)
                          : item
                      )
                      .join(', ')
                  : '-'}
              </Text>
            </View>
          )}

          {index === 5 && (
            <View style={styles.termsCard}>
              <Text style={styles.termsTitle}>One last step</Text>
              <Text style={styles.termsSubtitle}>
                Please review our Terms of Use / EULA. You’ll need to accept them before continuing.
              </Text>
              <Pressable style={styles.termsLinkRow} onPress={() => setTermsModalVisible(true)}>
                <Text style={styles.termsLinkText}>Read Terms of Use / EULA</Text>
              </Pressable>
              <View style={styles.termsCheckboxRow}>
                <Checkbox
                  value={termsAccepted}
                  onValueChange={(value) => {
                    setTermsAccepted(value)
                    if (validationError) setValidationError('')
                  }}
                  color={termsAccepted ? '#5BC0F8' : undefined}
                  style={styles.checkbox}
                />
                <Text style={styles.checkboxLabel}>
                  I agree to the{' '}
                  <Text style={styles.checkboxLink} onPress={() => setTermsModalVisible(true)}>
                    Terms of Use / EULA
                  </Text>
                  .
                </Text>
              </View>
            </View>
          )}

          {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}

          <Pressable
            onPress={handleNext}
            disabled={nextDisabled}
            style={({ pressed }) => [
              {
                opacity: pressed || nextDisabled ? 0.6 : 1,
              },
            ]}
          >
            <Animated.View style={[styles.nextButton, { transform: [{ scale: nextPulse }] }]}
            >
              <Text style={styles.nextText}>{saving ? 'saving...' : index === slides.length - 1 ? 'finish' : 'next'}</Text>
            </Animated.View>
          </Pressable>

          <View style={styles.progressBarBackground}>
            <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
          </View>
        </Animated.View>

        <Modal visible={countryModalVisible} animationType="fade" transparent>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => setCountryModalVisible(false)}>
              <View style={styles.modalBackdropTouchable} />
            </TouchableWithoutFeedback>
            <View style={styles.locationModal}>
              <Text style={styles.modalTitle}>Select country</Text>
              <ScrollView contentContainerStyle={styles.locationList} showsVerticalScrollIndicator={false}>
                {LOCATION_OPTIONS.map(({ country }) => {
                  const active = country === selectedCountry
                  return (
                    <Pressable
                      key={country}
                      style={[styles.locationOption, active && styles.locationOptionActive]}
                      onPress={() => handleCountrySelect(country)}
                    >
                      <Text style={[styles.locationOptionText, active && styles.locationOptionTextActive]}>
                        {country}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal visible={cityModalVisible} animationType="fade" transparent>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => setCityModalVisible(false)}>
              <View style={styles.modalBackdropTouchable} />
            </TouchableWithoutFeedback>
            <View style={styles.locationModal}>
              <Text style={styles.modalTitle}>Select city</Text>
              <Text style={styles.locationSubtitle}>
                {selectedCountry ? `Country: ${selectedCountry}` : 'Choose a country first'}
              </Text>
              <Pressable
                style={styles.changeLocationLink}
                onPress={() => {
                  setCityModalVisible(false)
                  setCountryModalVisible(true)
                }}
              >
                <Text style={styles.changeLocationText}>change country</Text>
              </Pressable>
              <ScrollView contentContainerStyle={styles.locationList} showsVerticalScrollIndicator={false}>
                {citiesForSelectedCountry.map((city) => {
                  const active = city === selectedCity
                  return (
                    <Pressable
                      key={city}
                      style={[styles.locationOption, active && styles.locationOptionActive]}
                      onPress={() => handleCitySelect(city)}
                    >
                      <Text style={[styles.locationOptionText, active && styles.locationOptionTextActive]}>{city}</Text>
                    </Pressable>
                  )
                })}
                {selectedCountry && citiesForSelectedCountry.length === 0 ? (
                  <Text style={styles.locationEmptyText}>No cities available for this country yet.</Text>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal visible={termsModalVisible} animationType="fade" transparent>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => setTermsModalVisible(false)}>
              <View style={styles.modalBackdropTouchable} />
            </TouchableWithoutFeedback>
            <View style={styles.termsModal}>
              <ScrollView
                contentContainerStyle={styles.termsContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.policyTitle}>Terms of Use / End User License Agreement</Text>
                <Text style={styles.policyParagraph}>
                  Welcome to CloseCircle. By continuing, you confirm that you are at least 18 years old and agree to use
                  the app responsibly. Respect community guidelines, refrain from sharing illegal content, and never
                  impersonate another person.
                </Text>
                <Text style={styles.policyParagraph}>
                  We grant you a personal, revocable license to use the app solely for matchmaking and messaging. Reverse
                  engineering, automated scraping, or reselling access is prohibited. We may suspend or terminate
                  accounts that breach these terms.
                </Text>
                <Text style={styles.policyParagraph}>
                  CloseCircle facilitates introductions but is not liable for match outcomes or offline interactions. Use
                  discretion, meet in public spaces, and report suspicious behaviour so we can take action quickly.
                </Text>
                <Text style={styles.policyParagraph}>
                  We update these terms occasionally. Continued use after updates take effect means you accept the
                  revised terms. Review the full policy at closecircle.app/help/terms or contact
                  legal@closecircle.app for questions.
                </Text>
                <Pressable
                  style={styles.termsExternalLink}
                  onPress={() => Linking.openURL('https://closecircle.app/help/terms').catch(() => {})}
                >
                  <Text style={styles.termsExternalLinkText}>Visit full policy online</Text>
                </Pressable>
              </ScrollView>
              <Pressable onPress={() => setTermsModalVisible(false)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={tagSelectorVisible} animationType="fade" transparent>
          <TouchableWithoutFeedback onPress={() => setTagSelectorVisible(false)}>
            <View style={styles.backdrop}>
              <View style={styles.modal}>
                <Text style={styles.modalTitle}>Select Interests</Text>
                <ScrollView contentContainerStyle={styles.tagList} showsVerticalScrollIndicator={false}>
                  {interestsList.map((interest) => (
                    <Pressable
                      key={interest}
                      style={[styles.tagOption, interests.includes(interest) && styles.tagOptionSelected]}
                      onPress={() => handleInterestToggle(interest)}
                    >
                      <Text style={styles.tagOptionText}>{interest}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Pressable style={styles.closeButton} onPress={() => setTagSelectorVisible(false)}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </Animated.View>
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
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
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
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  bioInput: {
    textAlignVertical: 'top',
    minHeight: 90,
    marginTop: 8,
  },
  locationSelectors: {
    width: '80%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  locationSelector: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  locationSelectorEmpty: {
    borderColor: 'rgba(0,122,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  locationSelectorDisabled: {
    opacity: 0.5,
  },
  locationSelectorText: {
    color: '#063970',
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
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
  tagText: { color: '#063970', fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
  tagLimitText: { width: '100%', textAlign: 'center', color: '#FF5A5F', fontSize: 13, marginTop: 6 },
  bioContainer: { width: '100%', alignItems: 'center' },
  summary: { marginTop: 10, alignItems: 'center' },
  summaryText: { fontSize: 16, color: '#063970', marginVertical: 3 },
  termsCard: {
    width: '90%',
    padding: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  termsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#063970',
    textTransform: 'capitalize',
  },
  termsSubtitle: {
    fontSize: 15,
    color: '#4F5D75',
    lineHeight: 20,
    marginTop: 12,
  },
  termsLinkRow: {
    paddingVertical: 8,
    marginTop: 10,
  },
  termsLinkText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  termsCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 15,
    color: '#063970',
    lineHeight: 20,
  },
  checkboxLink: {
    color: '#007AFF',
    fontWeight: '700',
  },
  errorText: { color: '#FF5A5F', fontSize: 14, textAlign: 'center', marginTop: 16 },
  nextButton: {
    marginTop: 40,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 25,
    shadowColor: '#007AFF',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  nextText: { color: '#fff', fontSize: 18, fontWeight: '700', textTransform: 'capitalize' },
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
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  modalBackdropTouchable: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  locationModal: {
    width: '80%',
    maxHeight: '65%',
    backgroundColor: '#E8F6FF',
    borderRadius: 24,
    padding: 24,
  },
  termsModal: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 18,
  },
  termsContent: {
    paddingBottom: 18,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#063970',
    marginBottom: 15,
    textAlign: 'center',
  },
  locationSubtitle: {
    marginTop: 6,
    color: '#5C738A',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  changeLocationLink: {
    alignSelf: 'flex-end',
    marginVertical: 8,
  },
  changeLocationText: {
    color: '#007AFF',
    fontWeight: '700',
  },
  locationList: {
    paddingVertical: 8,
  },
  locationOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    marginBottom: 10,
  },
  locationOptionActive: {
    backgroundColor: '#007AFF',
  },
  locationOptionText: {
    color: '#063970',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  locationOptionTextActive: {
    color: '#fff',
  },
  locationEmptyText: {
    textAlign: 'center',
    color: '#5C738A',
    marginTop: 12,
  },
  policyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#063970',
  },
  policyParagraph: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4F5D75',
  },
  termsExternalLink: {
    paddingVertical: 8,
    marginTop: 4,
  },
  termsExternalLinkText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  modalCloseButton: {
    marginTop: 12,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#007AFF',
  },
  modalCloseText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    width: width * 0.85,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  tagList: {
    width: '100%',
    alignItems: 'center',
  },
  tagOption: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tagOptionSelected: {
    backgroundColor: '#E0F7FA',
    borderBottomColor: 'transparent',
  },
  tagOptionText: {
    fontSize: 18,
    color: '#063970',
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  genderTagRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
    width: '80%',
  },
  genderTag: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    margin: 6,
  },
  genderTagActive: {
    backgroundColor: '#007AFF',
  },
  genderTagText: {
    color: '#063970',
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  genderTagTextActive: {
    color: '#fff',
  },
})

