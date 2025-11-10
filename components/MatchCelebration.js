import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Pressable, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const CONFETTI_COLORS = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#F473B9', '#B28DFF'];

const createConfettiPieces = (seed) => {
  if (!seed) return [];
  return Array.from({ length: 36 }).map((_, index) => {
    const progress = new Animated.Value(0);
    const startX = Math.random() * SCREEN_W;
    const startY = -Math.random() * 140 - 30;
    const endY = SCREEN_H * 0.65 + Math.random() * 120;
    const xDrift = (Math.random() - 0.5) * (SCREEN_W * 0.4);
    const duration = 1800 + Math.random() * 900;
    const delay = Math.random() * 360;
    const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
    const width = 6 + Math.random() * 10;
    const height = width * (0.45 + Math.random() * 0.6);
    const radius = Math.random() > 0.6 ? 3 : 1;
    const startRotation = Math.random() * 360;
    const endRotation =
      startRotation +
      (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360);

    return {
      id: `${seed}-${index}`,
      progress,
      startX,
      startY,
      endY,
      xDrift,
      duration,
      delay,
      color,
      width,
      height,
      radius,
      startRotation,
      endRotation,
    };
  });
};

const ConfettiOverlay = ({ seed }) => {
  const pieces = useMemo(() => createConfettiPieces(seed), [seed]);

  useEffect(() => {
    if (!seed) return;

    const animations = pieces.map((piece) =>
      Animated.timing(piece.progress, {
        toValue: 1,
        duration: piece.duration,
        delay: piece.delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start()
    );

    return () => {
      animations.forEach((animation) => {
        if (animation?.stop) animation.stop();
      });
    };
  }, [seed, pieces]);

  if (!seed) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((piece) => {
        const translateY = piece.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [piece.startY, piece.endY],
        });
        const translateX = piece.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, piece.xDrift],
        });
        const rotate = piece.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [`${piece.startRotation}deg`, `${piece.endRotation}deg`],
        });
        const opacity = piece.progress.interpolate({
          inputRange: [0, 0.1, 0.8, 1],
          outputRange: [0, 1, 1, 0],
        });

        return (
          <Animated.View
            key={piece.id}
            style={[
              styles.confettiPiece,
              {
                backgroundColor: piece.color,
                width: piece.width,
                height: piece.height,
                borderRadius: piece.radius,
                left: piece.startX,
                transform: [{ translateY }, { translateX }, { rotate }],
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

export default function MatchCelebration({
  visible,
  name = 'Someone',
  subtitle = 'You both liked each other – say hello!',
  onContinue,
  onMessage,
}) {
  const [rendered, setRendered] = useState(visible);
  const [seed, setSeed] = useState(0);
  const opacity = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      setSeed(Date.now());
      opacity.setValue(0);
      backdropOpacity.setValue(0);
      translateY.setValue(40);
      scale.setValue(0.92);

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          speed: 12,
          bounciness: 7,
          useNativeDriver: false,
        }),
        Animated.spring(scale, {
          toValue: 1,
          speed: 12,
          bounciness: 6,
          useNativeDriver: false,
        }),
      ]).start();
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(scale, {
          toValue: 0.94,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start(() => setRendered(false));
    }
  }, [visible, name, rendered, opacity, translateY, scale, backdropOpacity]);

  if (!rendered) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View
        pointerEvents="auto"
        style={[
          styles.backdrop,
          {
            opacity: backdropOpacity,
          },
        ]}
      />
      <ConfettiOverlay seed={seed} />
      <Animated.View
        style={[
          styles.cardWrapper,
          { opacity, transform: [{ translateY }, { scale }] },
        ]}
      >
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.96)', 'rgba(234, 246, 255, 0.95)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardBackground}
        />
        <View style={styles.iconWrapper}>
          <LinearGradient
            colors={['#FF6B6B', '#C81D25']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconCircle}
          >
            <AntDesign name="heart" size={28} color="#fff" />
          </LinearGradient>
        </View>
        <Text style={styles.title}>It's a match!</Text>
        <Text style={styles.subtitle}>
          You and <Text style={styles.highlight}>{name}</Text> liked each other.
        </Text>
        {subtitle ? <Text style={styles.secondarySubtitle}>{subtitle}</Text> : null}
        <View style={styles.buttonRow}>
          <Pressable
            style={styles.secondaryButton}
            onPress={onContinue}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>Keep browsing</Text>
          </Pressable>
          <Pressable
            style={styles.primaryButton}
            onPress={onMessage}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={['#5BC0F8', '#007AFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButtonGradient}
            >
              <Text style={styles.primaryButtonText}>Message now</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 57, 112, 0.28)',
  },
  cardWrapper: {
    width: Math.min(SCREEN_W - 48, 360),
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#5BC0F8',
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  cardBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
  },
  iconWrapper: {
    marginTop: -12,
    marginBottom: 18,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#063970',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#406080',
    textAlign: 'center',
    lineHeight: 22,
  },
  secondarySubtitle: {
    fontSize: 14,
    color: '#6C8197',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  highlight: {
    color: '#007AFF',
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(91,192,248,0.5)',
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F4C81',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  confettiPiece: {
    position: 'absolute',
    top: -40,
  },
});


