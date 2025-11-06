import React, { useRef, useState, useEffect } from 'react';
import { View, Pressable, Animated, StyleSheet, Dimensions, Platform, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { AntDesign, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

/* ---------- NavButton ---------- */
function NavButton({ type = 'swipe', active, focused, onPress }) {
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
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: focused ? 0.7 : 1,
        duration: 250,
        useNativeDriver: true,
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
      Animated.timing(lift, { toValue: -6, duration: 120, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1.1, friction: 5, tension: 120, useNativeDriver: true }),
    ]).start();
    
    // Start JS driver animation separately
    setTimeout(() => {
      Animated.timing(glow, { toValue: 1, duration: 180, useNativeDriver: false }).start(() => {
        Animated.parallel([
          Animated.spring(lift, { toValue: 0, friction: 6, tension: 100, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1.08, friction: 6, tension: 120, useNativeDriver: true }),
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
          style={{
            transform: [{ translateY: lift }, { scale }],
            opacity: fade,
          }}
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
  const fadeIn = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(-20)).current;
  
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
      Animated.timing(fadeIn, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(lift, { toValue: 0, friction: 6, tension: 100, useNativeDriver: true }),
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
});
