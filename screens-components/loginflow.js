import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function LoginFlow() {
  const navigation = useNavigation();
  const { signIn, isAuthenticated, loading: authLoading, onboardingComplete, lastAuthAction } = useAuth();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (lastAuthAction === 'signup') {
      navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
    } else if (onboardingComplete) {
      navigation.reset({ index: 0, routes: [{ name: 'SwipeScreen' }] });
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
    }
    setSubmitting(false);
  }, [isAuthenticated, onboardingComplete, lastAuthAction, navigation]);


  const handleNext = async () => {
    if (step === 1) {
      // Validate email and move to password step
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -width * 0.3,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setStep(2);
        slideAnim.setValue(width * 0.3);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      setSubmitting(true);
      setErrorMessage(null);
      const { error } = await signIn(email.trim(), password);
      if (error) {
        const message = error.message || 'Unable to sign in. Please try again.';
        setErrorMessage(message);
        setSubmitting(false);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient
        colors={['#E8F6FF', '#F3FAFF', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <AntDesign name="left" size={24} color="#063970" />
        </Pressable>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / 2) * 100}%` }]} />
        </View>
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {step === 1 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Enter your email</Text>
            <Text style={styles.subtitle}>We'll use this to sign you in</Text>
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Email address"
                placeholderTextColor="#8EA1B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
            </View>
          </View>
        ) : (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Enter your password</Text>
            <Text style={styles.subtitle}>Secure your account</Text>
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Password"
                placeholderTextColor="#8EA1B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
              />
            </View>
          </View>
        )}

        <Pressable
          onPress={handleNext}
          style={styles.continueButton}
          disabled={submitting || authLoading || (step === 1 ? !email.trim() : !password.trim())}
        >
          <LinearGradient
            colors={
              step === 1 && !email.trim()
                ? ['#D0D0D0', '#B0B0B0']
                : step === 2 && !password.trim()
                ? ['#D0D0D0', '#B0B0B0']
                : submitting || authLoading
                ? ['#A0BCD4', '#7AA0C2']
                : ['#5BC0F8', '#007AFF']
            }
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>
              {submitting || authLoading ? 'Signing In...' : step === 1 ? 'Continue' : 'Sign In'}
            </Text>
            <AntDesign name="right" size={20} color="#fff" style={{ marginLeft: 8 }} />
          </LinearGradient>
        </Pressable>
        {errorMessage && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  backButton: {
    marginBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E6ED',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#5BC0F8',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  stepContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#063970',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#5C738A',
    marginBottom: 40,
  },
  inputContainer: {
    marginTop: 20,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 16,
    fontSize: 16,
    color: '#063970',
    borderWidth: 1,
    borderColor: '#E0E6ED',
  },
  continueButton: {
    marginTop: 40,
    marginBottom: 40,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#007AFF',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  errorText: {
    marginTop: 12,
    color: '#FF4C4C',
    textAlign: 'center',
    fontSize: 14,
  },
});
