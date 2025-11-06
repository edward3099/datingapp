import React, { useRef, useState, useEffect } from 'react';
import { View, Pressable, Animated, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { AntDesign, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

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
        toValue: focused ? 0.9 : active ? 1.12 : 1,
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
    Animated.sequence([
      Animated.parallel([
        Animated.timing(lift, { toValue: -8, duration: 120, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1.15, friction: 5, tension: 120, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 1, duration: 180, useNativeDriver: false }),
      ]),
      Animated.parallel([
        Animated.spring(lift, { toValue: 0, friction: 6, tension: 100, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1.12, friction: 6, tension: 120, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 350, useNativeDriver: false }),
      ]),
    ]).start(() => onPress());
  };

  const glowShadow = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0)', gradients[type][0] + '99'],
  });

  const renderIcon = () => {
    if (type === 'messages') return <Feather name="send" size={26} color="#fff" />;
    if (type === 'swipe') return <AntDesign name="heart" size={26} color="#fff" />;
    return <AntDesign name="user" size={26} color="#fff" />;
  };

  return (
    <Pressable onPress={handlePress} style={styles.pressArea}>
      <Animated.View
        style={{
          transform: [{ translateY: lift }, { scale }],
          opacity: fade,
          shadowColor: glowShadow,
          shadowOpacity: 0.9,
          shadowRadius: active ? 14 : 6,
          shadowOffset: { width: 0, height: 4 },
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
    </Pressable>
  );
}

/* ---------- TopNavBar ---------- */
export default function TopNavBar() {
  const navigation = useNavigation();
  const route = useRoute();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(-20)).current;

  // Determine current screen based on route name
  const getCurrentScreen = () => {
    const routeName = route.name;
    if (routeName === 'SwipeScreen') return 'swipe';
    if (routeName === 'Messages' || routeName === 'Chats') return 'messages';
    if (routeName === 'UserProfile' || routeName === 'ViewProfile') return 'profile';
    return 'swipe'; // default
  };

  const current = getCurrentScreen();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(lift, { toValue: 0, friction: 6, tension: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleNavPress = (type) => {
    if (type === 'swipe' && current !== 'swipe') {
      navigation.navigate('SwipeScreen');
    } else if (type === 'messages' && current !== 'messages') {
      navigation.navigate('Chats');
    } else if (type === 'profile' && current !== 'profile') {
      navigation.navigate('UserProfile');
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeIn, transform: [{ translateY: lift }] }]}>
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
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  navWrap: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: width * 0.8,
    paddingVertical: 8,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.45)',
    shadowColor: '#5BC0F8',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    overflow: 'hidden',
  },
  pressArea: { alignItems: 'center', justifyContent: 'center', marginHorizontal: 6 },
  button: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reflection: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: 5,
    height: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
});
