import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function LoginSignUp() {
  const navigation = useNavigation();
  const [isLogin, setIsLogin] = useState(true);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const toggleMode = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: isLogin ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsLogin(!isLogin);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleContinue = () => {
    if (isLogin) {
      navigation.navigate('LoginFlow');
    } else {
      navigation.navigate('Onboarding');
    }
  };

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width],
  });

  return (
    <LinearGradient
      colors={['#E8F6FF', '#F3FAFF', '#FFFFFF']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Get Started'}</Text>
        <Text style={styles.subtitle}>
          {isLogin ? 'Sign in to continue' : 'Create your account'}
        </Text>
      </View>

      <Animated.View
        style={[
          styles.formContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateX }],
          },
        ]}
      >
        {isLogin ? (
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Email or username"
                placeholderTextColor="#8EA1B8"
                style={styles.input}
              />
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Password"
                placeholderTextColor="#8EA1B8"
                secureTextEntry
                style={styles.input}
              />
            </View>
            <Pressable onPress={() => navigation.navigate('LoginFlow')}>
              <Text style={styles.forgotPassword}>Forgot password?</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Email"
                placeholderTextColor="#8EA1B8"
                keyboardType="email-address"
                style={styles.input}
              />
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Create password"
                placeholderTextColor="#8EA1B8"
                secureTextEntry
                style={styles.input}
              />
            </View>
          </View>
        )}

        <Pressable onPress={handleContinue} style={styles.continueButton}>
          <LinearGradient
            colors={['#5BC0F8', '#007AFF']}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>
              {isLogin ? 'Sign In' : 'Sign Up'}
            </Text>
            <AntDesign name="arrowright" size={20} color="#fff" style={{ marginLeft: 8 }} />
          </LinearGradient>
        </Pressable>
      </Animated.View>

      <View style={styles.toggleContainer}>
        <Text style={styles.toggleText}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
        </Text>
        <Pressable onPress={toggleMode}>
          <Text style={styles.toggleLink}>
            {isLogin ? 'Sign Up' : 'Sign In'}
          </Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 100,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#063970',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#5C738A',
  },
  formContainer: {
    flex: 1,
  },
  form: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    padding: 16,
    fontSize: 16,
    color: '#063970',
    borderWidth: 1,
    borderColor: '#E0E6ED',
  },
  forgotPassword: {
    color: '#5BC0F8',
    fontSize: 14,
    textAlign: 'right',
    marginTop: 8,
  },
  continueButton: {
    marginTop: 20,
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
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  toggleText: {
    color: '#5C738A',
    fontSize: 14,
  },
  toggleLink: {
    color: '#5BC0F8',
    fontSize: 14,
    fontWeight: '700',
  },
});
