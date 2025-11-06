import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableWithoutFeedback,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

const { width: SCREEN_W } = Dimensions.get('window')

export default function ChatsScreen() {
  const [messages, setMessages] = useState(
    Array.from({ length: 20 }).map((_, i) => ({
      id: i.toString(),
      text:
        i % 2 === 0
          ? 'hey, how have you been lately? it’s been a while since we talked. i’ve been busy but wanted to catch up.'
          : 'oh really? that sounds nice! what have you been working on recently?',
      sender: i % 2 === 0 ? 'other' : 'me',
      time: '2:' + (40 + i) + ' PM',
    }))
  )

  const [text, setText] = useState('')
  const inputScale = useRef(new Animated.Value(1)).current
  const sendPulse = useRef(new Animated.Value(0)).current
  const screenLift = useRef(new Animated.Value(0)).current
  const listRef = useRef(null)

  const typingAnim = useRef(new Animated.Value(0)).current
  const [typing, setTyping] = useState(false)

  useEffect(() => {
    Animated.timing(screenLift, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start()
  }, [screenLift])

  useEffect(() => {
    const loop = setInterval(() => {
      setTyping(true)
      Animated.sequence([
        Animated.timing(typingAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(typingAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setTyping(false))
    }, 7000)
    return () => clearInterval(loop)
  }, [typingAnim])

  const handleSend = () => {
    if (text.trim() === '') return
    const newMsg = { id: Date.now().toString(), text, sender: 'me', time: 'now' }
    setMessages((prev) => [...prev, newMsg])
    setText('')
    Animated.sequence([
      Animated.timing(sendPulse, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(sendPulse, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start()
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 200)
  }

  const handleFocus = () => Animated.spring(inputScale, { toValue: 0.97, useNativeDriver: true }).start()
  const handleBlur = () => Animated.spring(inputScale, { toValue: 1, useNativeDriver: true }).start()

  const scaleIn = screenLift.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] })
  const glowOpacity = screenLift.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] })

  const typingTranslate = typingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  })
  const typingOpacity = typingAnim

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: scaleIn }], shadowOpacity: glowOpacity },
      ]}
    >
      <LinearGradient
        colors={['#E8F6FF', '#F3FAFF', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: 'rgba(91,192,248,0.25)',
            opacity: glowOpacity,
          },
        ]}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Image source={{ uri: 'https://picsum.photos/200/200?random' }} style={styles.headerAvatar} />
            <Text style={styles.headerName}>Amara</Text>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <AnimatedMessageBubble item={item} index={index} />}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <Animated.View
              style={[
                styles.typingIndicator,
                { opacity: typingOpacity, transform: [{ translateY: typingTranslate }] },
              ]}
            >
              <Text style={styles.typingText}>Amara is typing...</Text>
            </Animated.View>
          }
        />

        <Animated.View style={[styles.inputContainer, { transform: [{ scale: inputScale }] }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Type a message..."
              placeholderTextColor="#8EA1B8"
              onFocus={handleFocus}
              onBlur={handleBlur}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <TouchableWithoutFeedback onPress={handleSend}>
              <Animated.View
                style={{
                  transform: [{ scale: sendPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }],
                }}
              >
                <LinearGradient colors={['#5BC0F8', '#007AFF']} style={styles.sendButton}>
                  <Text style={styles.sendText}>↑</Text>
                </LinearGradient>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  )
}

function AnimatedMessageBubble({ item, index }) {
  const isMe = item.sender === 'me'
  const translateY = useRef(new Animated.Value(20)).current
  const opacity = useRef(new Animated.Value(0)).current
  const rippleScale = useRef(new Animated.Value(0)).current
  const rippleOpacity = useRef(new Animated.Value(0.6)).current

  useEffect(() => {
    const delay = 80 * index
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, speed: 14, bounciness: 8, delay, useNativeDriver: true }),
    ]).start()

    Animated.sequence([
      Animated.delay(delay + 200),
      Animated.parallel([
        Animated.timing(rippleScale, { toValue: 3, duration: 500, useNativeDriver: true }),
        Animated.timing(rippleOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start(() => {
      rippleScale.setValue(0)
      rippleOpacity.setValue(0.6)
    })
  }, [index, opacity, rippleOpacity, rippleScale, translateY])

  return (
    <Animated.View
      style={[
        styles.messageWrapper,
        isMe ? styles.messageRight : styles.messageLeft,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={{ position: 'relative' }}>
        <Animated.View
          style={[
            styles.ripple,
            {
              backgroundColor: 'rgba(91,192,248,0.35)',
              opacity: rippleOpacity,
              transform: [{ scale: rippleScale }],
            },
          ]}
        />
        <LinearGradient
          colors={
            isMe
              ? ['#5BC0F8', '#007AFF']
              : ['rgba(255,255,255,0.75)', 'rgba(240,250,255,0.9)']
          }
          style={[styles.messageBubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}
        >
          <Text style={[styles.messageText, { color: isMe ? '#fff' : '#2C3E50' }]}>{item.text}</Text>
        </LinearGradient>
      </View>
      <Text style={styles.time}>{item.time}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F6FF',
    shadowColor: '#5BC0F8',
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 70,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerInfo: { flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  headerName: { fontSize: 20, fontWeight: '700', color: '#063970' },
  messagesList: { paddingHorizontal: 16, paddingBottom: 20 },
  typingIndicator: { marginTop: 10, paddingHorizontal: 16 },
  typingText: { fontSize: 14, color: '#5C738A', fontStyle: 'italic' },
  messageWrapper: { marginVertical: 8, maxWidth: SCREEN_W * 0.8 },
  messageLeft: { alignSelf: 'flex-start' },
  messageRight: { alignSelf: 'flex-end' },
  messageBubble: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#5BC0F8',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  ripple: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 40,
    height: 40,
    borderRadius: 20,
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  bubbleLeft: { borderBottomLeftRadius: 6 },
  bubbleRight: { borderBottomRightRadius: 6 },
  messageText: { fontSize: 16, lineHeight: 22 },
  time: { fontSize: 11, color: '#5C738A', marginTop: 4, marginHorizontal: 6 },
  inputContainer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  input: { flex: 1, fontSize: 16, color: '#063970', paddingVertical: 10, paddingHorizontal: 10 },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  sendText: { color: '#fff', fontSize: 18, fontWeight: '700' },
})
