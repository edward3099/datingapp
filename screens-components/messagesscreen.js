import React, { useRef, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Animated,
  Image,
  Dimensions,
  TouchableWithoutFeedback,
  Easing,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import TopNavBar from '../components/TopNavBar'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

const matches = [
  { id: '1', name: 'Amara', image: 'https://picsum.photos/200/200?1' },
  { id: '2', name: 'Nate', image: 'https://picsum.photos/200/200?2' },
  { id: '3', name: 'Luna', image: 'https://picsum.photos/200/200?3' },
  { id: '4', name: 'Jules', image: 'https://picsum.photos/200/200?4' },
  { id: '5', name: 'Kai', image: 'https://picsum.photos/200/200?5' },
  { id: '6', name: 'Mia', image: 'https://picsum.photos/200/200?6' },
  { id: '7', name: 'Leo', image: 'https://picsum.photos/200/200?7' },
  { id: '8', name: 'Zara', image: 'https://picsum.photos/200/200?8' },
]

const initialMessages = [
  { id: '101', name: 'Amara', message: 'hey, how’s your day?', time: '2m ago', image: 'https://picsum.photos/200/200?1', read: false },
  { id: '102', name: 'Nate', message: 'we should grab coffee soon ☕', time: '5m ago', image: 'https://picsum.photos/200/200?2', read: false },
  { id: '103', name: 'Luna', message: 'loved your last playlist 💿', time: '12m ago', image: 'https://picsum.photos/200/200?3', read: true },
  { id: '104', name: 'Jules', message: 'debugging life rn 😂', time: '1h ago', image: 'https://picsum.photos/200/200?4', read: true },
  { id: '105', name: 'Kai', message: 'let’s skate tomorrow!', time: '3h ago', image: 'https://picsum.photos/200/200?5', read: false },
  { id: '106', name: 'Zara', message: 'what a match 😎', time: '1d ago', image: 'https://picsum.photos/200/200?6', read: true },
  { id: '107', name: 'Leo', message: 'did you watch it?', time: '2d ago', image: 'https://picsum.photos/200/200?7', read: true },
  { id: '108', name: 'Mia', message: 'good morning 🌤️', time: '2d ago', image: 'https://picsum.photos/200/200?8', read: false },
]

export default function MessagesScreen() {
  const navigation = useNavigation()
  const headerAnim = useRef(new Animated.Value(0)).current
  const [messages, setMessages] = useState(initialMessages)

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()
  }, [headerAnim])

  const fadeIn = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  })

  const openChat = (item) => {
    // Mark message as read
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === item.id ? { ...msg, read: true } : msg
      )
    )
    // Navigate to ChatsScreen with chat data
    navigation.navigate('Chats', { 
      chatName: item.name,
      chatImage: item.image 
    })
  }

  const combinedData = [
    { type: 'header' },
    { type: 'matches' },
    ...messages.map((m) => ({ type: 'message', data: m })),
  ]

  return (
    <LinearGradient colors={['#E8F6FF', '#F3FAFF']} style={styles.container}>
      <TopNavBar />
      <FlatList
        data={combinedData}
        keyExtractor={(item, index) => `${item.type}-${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 110, paddingBottom: 120 }}
        renderItem={({ item, index }) => {
          if (item.type === 'header')
            return (
              <Animated.View
                style={[
                  styles.header,
                  {
                    opacity: fadeIn,
                    transform: [
                      {
                        translateY: headerAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-20, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.headerTitle}>Messages</Text>
              </Animated.View>
            )

          if (item.type === 'matches')
            return (
              <View style={styles.matchesSection}>
                <Text style={styles.sectionTitle}>Matches</Text>
                <FlatList
                  data={matches}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20 }}
                  renderItem={({ item }) => <MatchBubble item={item} onPress={() => openChat(item)} />}
                  keyExtractor={(m) => m.id}
                />
              </View>
            )

          if (item.type === 'message')
            return (
              <Animated.View
                style={{
                  ...styles.messageItem,
                  transform: [
                    {
                      translateY: headerAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20 + index * 5, 0],
                      }),
                    },
                  ],
                  opacity: fadeIn,
                }}
              >
                {item.data.read ? (
                  <TouchableWithoutFeedback onPress={() => openChat(item.data)}>
                    <View style={styles.readMessageCard}>
                      <Image source={{ uri: item.data.image }} style={styles.avatar} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{item.data.name}</Text>
                        <Text style={styles.messageRead}>{item.data.message}</Text>
                      </View>
                      <Text style={styles.timeRead}>{item.data.time}</Text>
                    </View>
                  </TouchableWithoutFeedback>
                ) : (
                  <UnreadCard item={item.data} onPress={() => openChat(item.data)} />
                )}
              </Animated.View>
            )

          return null
        }}
      />
    </LinearGradient>
  )
}

function MatchBubble({ item, onPress }) {
  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <View style={styles.matchBubbleContainer}>
        <LinearGradient colors={['#FFFFFF', '#DDF4FF']} style={styles.matchBubble}>
          <Image source={{ uri: item.image }} style={styles.matchImage} />
        </LinearGradient>
        <Text style={styles.matchName}>{item.name}</Text>
      </View>
    </TouchableWithoutFeedback>
  )
}

function UnreadCard({ item, onPress }) {
  const pulseAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [pulseAnim])

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  })

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
        shadowColor: '#5BC0F8',
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        borderRadius: 22,
      }}
    >
      <TouchableWithoutFeedback onPress={onPress}>
        <LinearGradient
          colors={['#C2ECFF', '#E6F8FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.unreadMessageCard}
        >
          <Image source={{ uri: item.image }} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.messageStrong}>{item.message}</Text>
          </View>
          <Text style={styles.timeStrong}>{item.time}</Text>
        </LinearGradient>
      </TouchableWithoutFeedback>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 0, paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: '#063970' },
  matchesSection: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#063970',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  matchBubbleContainer: {
    alignItems: 'center',
    marginRight: 18,
    borderRadius: 38,
  },
  matchBubble: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F6FF',
  },
  matchImage: { width: 68, height: 68, borderRadius: 34 },
  matchName: {
    fontSize: 13,
    marginTop: 6,
    color: '#063970',
    fontWeight: '600',
    maxWidth: 70,
    textAlign: 'center',
  },
  messageItem: { marginBottom: 12 },
  unreadMessageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    padding: 14,
  },
  readMessageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    padding: 14,
    backgroundColor: '#E8F6FF',
  },
  avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 14 },
  name: { fontSize: 16, fontWeight: '700', color: '#063970' },
  messageStrong: { fontSize: 15, color: '#035E9E', marginTop: 2, fontWeight: '600' },
  messageRead: { fontSize: 14, color: '#6C8BA4', marginTop: 2 },
  timeStrong: { fontSize: 12, color: '#0277BD', fontWeight: '600' },
  timeRead: { fontSize: 12, color: '#9CB8CC' },
})
