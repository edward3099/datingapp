import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { logger } from '../utils/logger';

const { width, height } = Dimensions.get('window');

/* ---------- Sparkles ---------- */
function SparkleDot({ cfg }) {
  const ty = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(cfg.delay),
        Animated.parallel([
          Animated.timing(op, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(ty, { toValue: -cfg.rise, duration: cfg.duration, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(op, { toValue: 0, duration: 600, useNativeDriver: true }),
          Animated.timing(ty, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [cfg]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: cfg.baseY,
        left: cfg.left,
        width: cfg.size,
        height: cfg.size,
        borderRadius: cfg.size / 2,
        backgroundColor: 'rgba(255,255,255,0.95)',
        opacity: op,
        transform: [{ translateY: ty }],
        shadowColor: '#FFFFFF',
        shadowOpacity: 0.6,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 0 },
      }}
    />
  );
}

function Sparkles({ count = 48 }) {
  const configs = useMemo(
    () =>
      Array.from({ length: count }).map(() => ({
        left: Math.random() * width,
        baseY: height * 0.35 + Math.random() * height * 0.5,
        size: 1 + Math.random() * 2.5,
        delay: Math.random() * 2500,
        duration: 2200 + Math.random() * 2200,
        rise: height * (0.18 + Math.random() * 0.28),
      })),
    []
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {configs.map((c, i) => (
        <SparkleDot key={`sp-${i}`} cfg={c} />
      ))}
    </View>
  );
}

/* ---------- Auth Screen ---------- */
export default function LoginSignUp() {
  const navigation = useNavigation();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [retype, setRetype] = useState('');

  const fadeIn = useRef(new Animated.Value(0)).current;
  const panelLift = useRef(new Animated.Value(20)).current;
  const panelScale = useRef(new Animated.Value(0.98)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const btnColor = useRef(new Animated.Value(0)).current;
  const btnGlow = useRef(new Animated.Value(0)).current;

  const passErrorGlow = useRef(new Animated.Value(0)).current;
  const retypeErrorGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(panelLift, { toValue: 0, useNativeDriver: true }),
      Animated.spring(panelScale, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
    ]).start();
  }, []);

  const bgBtnColor = btnColor.interpolate({
    inputRange: [0, 1],
    outputRange: ['#007AFF', '#FF4C4C'],
  });

  const glowOpacity = btnGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.55],
  });

  const passBorderColor = passErrorGlow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.65)', '#FF4C4C'],
  });

  const retypeBorderColor = retypeErrorGlow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.65)', '#FF4C4C'],
  });

  const flashError = () => {
    // Stop any existing animations first
    passErrorGlow.stopAnimation();
    retypeErrorGlow.stopAnimation();
    
    // Reset values
    passErrorGlow.setValue(0);
    retypeErrorGlow.setValue(0);
    
    Animated.parallel([
      Animated.sequence([
        Animated.timing(passErrorGlow, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.timing(passErrorGlow, { toValue: 0, duration: 400, useNativeDriver: false }),
      ]),
      Animated.sequence([
        Animated.timing(retypeErrorGlow, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.timing(retypeErrorGlow, { toValue: 0, duration: 400, useNativeDriver: false }),
      ]),
    ]).start();
  };

  const onContinue = () => {
    try {
      if (mode === 'signup' && password !== retype) {
        flashError();
        logger.warn('Password mismatch', { mode, passwordLength: password.length });
        return;
      }

      // Stop any running animations first
      btnScale.stopAnimation();
      btnGlow.stopAnimation();
      btnColor.stopAnimation();

      // Start animations separately to avoid mixing native/JS drivers
      Animated.spring(btnScale, { toValue: 0.95, useNativeDriver: true }).start();
      
      setTimeout(() => {
        Animated.timing(btnGlow, { toValue: 1, duration: 180, useNativeDriver: false }).start(() => {
          // After glow reaches max, reverse it
          Animated.timing(btnGlow, { toValue: 0, duration: 220, useNativeDriver: false }).start();
        });
        
        // Scale back to 1
        setTimeout(() => {
          Animated.spring(btnScale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start(() => {
            // Animation complete callback
            try {
              // Navigate after animation completes
              logger.info('Navigation triggered', { mode, target: mode === 'signin' ? 'SwipeScreen' : 'Onboarding' });
              if (mode === 'signin') {
                navigation.replace('SwipeScreen');
              } else {
                navigation.replace('Onboarding');
              }
            } catch (navError) {
              logger.error('Navigation error', { error: navError.toString(), stack: navError.stack, mode });
            }
          });
        }, 180);
      }, 0);
    } catch (error) {
      logger.error('onContinue error', { error: error.toString(), stack: error.stack, mode });
    }
  };

  const toggleMode = () => setMode((m) => (m === 'signin' ? 'signup' : 'signin'));

  return (
    <LinearGradient
      colors={['#B8E9FF', '#E8F6FF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Animated.View pointerEvents="none" style={styles.depthFog} />
      <Animated.View pointerEvents="none" style={styles.depthFog2} />
      <Sparkles count={54} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, width: '100%' }}>
        <View style={styles.safePad} />

        <View style={styles.headerWrap}>
          <Text style={styles.brand}>amour</Text>
          <Text style={styles.tagline}>{mode === 'signin' ? 'welcome back' : 'create your vibe'}</Text>
        </View>

        <Animated.View
          style={[
            styles.card,
            { opacity: fadeIn, transform: [{ translateY: panelLift }, { scale: panelScale }] },
          ]}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.18)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>{mode === 'signin' ? 'sign in' : 'sign up'}</Text>

            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#8FB3CC"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={{ height: 14 }} />

            <Animated.View style={[styles.inputWrap, { borderColor: passBorderColor }]}>
              <Text style={styles.inputLabel}>password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#8FB3CC"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </Animated.View>

            {mode === 'signup' && (
              <>
                <View style={{ height: 14 }} />
                <Animated.View style={[styles.inputWrap, { borderColor: retypeBorderColor }]}>
                  <Text style={styles.inputLabel}>retype password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#8FB3CC"
                    secureTextEntry
                    value={retype}
                    onChangeText={setRetype}
                  />
                </Animated.View>
              </>
            )}

            <View style={{ height: 22 }} />

            <TouchableWithoutFeedback
              onPressIn={() => {
                // Stop all animations first
                btnScale.stopAnimation();
                btnColor.stopAnimation();
                btnGlow.stopAnimation();
                
                // Start animations separately - cannot use parallel with mixed drivers
                // Start native driver animation first
                Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start();
                
                // Start JS driver animation separately (for colors, must use JS driver)
                // Small delay to ensure btnColor is not affected by native driver
                setTimeout(() => {
                  Animated.timing(btnColor, { toValue: 1, duration: 220, useNativeDriver: false }).start();
                }, 10);
              }}
              onPressOut={() => {
                // Stop all animations first
                btnScale.stopAnimation();
                btnColor.stopAnimation();
                btnGlow.stopAnimation();
                
                // Start animations separately
                Animated.spring(btnScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
                
                // Start JS driver animation separately
                setTimeout(() => {
                  Animated.timing(btnColor, { toValue: 0, duration: 260, useNativeDriver: false }).start();
                }, 10);
                
                onContinue();
              }}
            >
              <Animated.View
                style={[
                  styles.cta,
                  {
                    transform: [{ scale: btnScale }],
                    backgroundColor: bgBtnColor,
                    shadowOpacity: glowOpacity,
                  },
                ]}
              >
                <Text style={styles.ctaText}>continue</Text>
              </Animated.View>
            </TouchableWithoutFeedback>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleText}>
                {mode === 'signin' ? "don't have an account?" : 'already have an account?'}
              </Text>
              <Pressable onPress={toggleMode} hitSlop={10}>
                <Text style={styles.toggleLink}>{mode === 'signin' ? 'sign up' : 'sign in'}</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
        <View style={{ height: 36 }} />
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safePad: { height: 64 },
  headerWrap: { alignItems: 'center', marginBottom: 12 },
  brand: { fontSize: 42, fontWeight: '800', color: '#063970', textTransform: 'lowercase' },
  tagline: { marginTop: 6, color: '#345E7A', fontSize: 14, fontWeight: '600' },
  depthFog: {
    position: 'absolute',
    width: width * 1.4,
    height: height * 0.8,
    top: height * 0.18,
    backgroundColor: '#89CFF0',
    opacity: 0.16,
    borderRadius: 900,
  },
  depthFog2: {
    position: 'absolute',
    width: width * 1.2,
    height: height * 0.9,
    top: height * 0.08,
    backgroundColor: '#C2ECFF',
    opacity: 0.12,
    borderRadius: 900,
  },
  card: {
    marginHorizontal: 18,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#5BC0F8',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  cardInner: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 18 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#0A4570', marginBottom: 14, textTransform: 'lowercase' },
  inputWrap: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputLabel: { fontSize: 12, color: '#467A99', fontWeight: '700', marginBottom: 6, textTransform: 'lowercase' },
  input: { fontSize: 16, color: '#063970', paddingVertical: 6 },
  cta: {
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '800', textTransform: 'lowercase' },
  toggleRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 14 },
  toggleText: { color: '#3E5F78', fontSize: 13, marginRight: 6 },
  toggleLink: { color: '#007AFF', fontSize: 13, fontWeight: '800' },
});
