import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Dimensions,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { AntDesign } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist'
import * as ImagePicker from 'expo-image-picker'
import TopNavBar from '../components/TopNavBar'

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_W = SCREEN_W * 0.94
const CARD_H = CARD_W * 1.35

const TAG_OPTIONS = [
  'music','poetry','travel','art','fitness','food','reading','gaming',
  'movies','pets','fashion','photography','nature','dance','yoga','coffee',
]

export default function UserProfileScreen() {
  const navigation = useNavigation()
  const [photos, setPhotos] = useState(
    Array.from({ length: 10 }).map((_, i) => ({
      id: i.toString(),
      uri: `https://picsum.photos/1000/1200?random=${i + 1}`,
    }))
  )
  const [currentPhoto, setCurrentPhoto] = useState(0)
  const slideAnim = useRef(new Animated.Value(0)).current

  const [tags, setTags] = useState(['poetry', 'music'])
  const [tagSelectorVisible, setTagSelectorVisible] = useState(false)
  const [galleryVisible, setGalleryVisible] = useState(false)
  const [notifVisible, setNotifVisible] = useState(false)
  const [privacyVisible, setPrivacyVisible] = useState(false)

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') await ImagePicker.requestMediaLibraryPermissionsAsync()
    })()
  }, [])

  const switchImage = (dir) => {
    let next = currentPhoto + dir
    if (next < 0) next = photos.length - 1
    if (next >= photos.length) next = 0
    Animated.timing(slideAnim, { toValue: -dir * CARD_W, duration: 120, useNativeDriver: true }).start(() => {
      setCurrentPhoto(next)
      slideAnim.setValue(dir * CARD_W)
      Animated.timing(slideAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start()
    })
  }

  const handleReorder = ({ data }) => setPhotos(data)
  const pickImage = async (id) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    })
    if (!result.canceled) {
      const newUri = result.assets[0].uri
      setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, uri: newUri } : p)))
    }
  }

  const handleDeleteTag = (t) => setTags((prev) => prev.filter((x) => x !== t))
  const handleAddTag = (t) => {
    if (tags.length >= 2 || tags.includes(t)) return
    setTags([...tags, t])
    setTagSelectorVisible(false)
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#E8F6FF', '#FFFFFF']} style={StyleSheet.absoluteFill} />
      <TopNavBar />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingTop: 110, paddingBottom: 120 }}>
        {/* CARD */}
        <View style={styles.cardContainer}>
          <TouchableWithoutFeedback
            onPress={(e) => {
              const x = e.nativeEvent.locationX
              if (x > CARD_W / 2) switchImage(1)
              else switchImage(-1)
            }}
          >
            <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
              <Image source={{ uri: photos[currentPhoto].uri }} style={styles.heroImage} />
            </Animated.View>
          </TouchableWithoutFeedback>

          <LinearGradient colors={['transparent', 'rgba(255,255,255,0.9)']} style={styles.heroFade} />

          <Pressable style={styles.editButton} onPress={() => setGalleryVisible(true)}>
            <AntDesign name="edit" size={26} color="#fff" />
          </Pressable>

          <View style={styles.progressBarContainer}>
            {photos.map((_, i) => (
              <View key={i} style={[styles.progressBarDot, { opacity: i === currentPhoto ? 1 : 0.3 }]} />
            ))}
          </View>
        </View>

        {/* INFO */}
        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>Amara, 24</Text>
            <View style={styles.tagRow}>
              {tags.map((t) => (
                <View key={t} style={styles.tag}>
                  <Text style={styles.tagText}>{t}</Text>
                  <Pressable onPress={() => handleDeleteTag(t)} hitSlop={8}>
                    <AntDesign name="close" size={12} color="#063970" style={{ marginLeft: 4 }} />
                  </Pressable>
                </View>
              ))}
              {tags.length < 2 && (
                <Pressable onPress={() => setTagSelectorVisible(true)}>
                  <View style={styles.addTag}>
                    <AntDesign name="plus" size={16} color="#063970" />
                  </View>
                </Pressable>
              )}
            </View>
          </View>

          <Text style={styles.bio}>
            designer & poet. lover of soft colours, old bookstores, and rainy mornings.
          </Text>

          {/* SETTINGS */}
          <View style={styles.settings}>
            <Text style={styles.settingsTitle}>Settings</Text>
            <Pressable onPress={() => setNotifVisible(true)}>
              <Text style={styles.settingsItem}>Notifications</Text>
            </Pressable>
            <Pressable onPress={() => setPrivacyVisible(true)}>
              <Text style={styles.settingsItem}>Privacy</Text>
            </Pressable>
          </View>

          {/* START SWIPING BUTTON */}
          <Pressable
            onPress={() => navigation.navigate('SwipeScreen')}
            style={styles.startButton}
          >
            <LinearGradient
              colors={['#5BC0F8', '#007AFF']}
              style={styles.startButtonGradient}
            >
              <Text style={styles.startButtonText}>Start Swiping</Text>
              <AntDesign name="right" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>

      {/* GALLERY MODAL */}
      <Modal visible={galleryVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={() => setGalleryVisible(false)}>
          <View style={styles.backdrop}>
            <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
          </View>
        </TouchableWithoutFeedback>

        <View style={styles.modalContainer} pointerEvents="box-none">
          <View style={styles.modalContent}>
            <View style={styles.modalGrabber} />
            <Text style={styles.modalTitle}>Your Gallery</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <DraggableFlatList
                data={photos}
                onDragEnd={handleReorder}
                keyExtractor={(i) => i.id}
                numColumns={3}
                activationDistance={12}
                scrollEnabled={false}
                contentContainerStyle={styles.gridContainer}
                renderItem={({ item, drag, isActive }) => (
                  <PhotoBox item={item} drag={drag} isActive={isActive} pickImage={pickImage} />
                )}
              />
            </ScrollView>
            <Pressable style={styles.closeButton} onPress={() => setGalleryVisible(false)}>
              <AntDesign name="closecircle" size={32} color="#5BC0F8" />
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* TAG SELECTOR MODAL */}
      <Modal visible={tagSelectorVisible} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setTagSelectorVisible(false)}>
          <View style={styles.backdrop}>
            <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
          </View>
        </TouchableWithoutFeedback>
        <View style={styles.tagModalContainer} pointerEvents="box-none">
          <View style={styles.tagModalContent}>
            <Text style={styles.modalTitle}>Select a Tag</Text>
            <ScrollView contentContainerStyle={styles.tagGrid} showsVerticalScrollIndicator={false}>
              {TAG_OPTIONS.map((tag) => {
                const disabled = tags.includes(tag) || tags.length >= 2
                return (
                  <Pressable key={tag} onPress={() => handleAddTag(tag)} disabled={disabled}>
                    <View style={[styles.tagOption, disabled && { opacity: 0.35 }]}>
                      <Text style={styles.tagOptionText}>{tag}</Text>
                    </View>
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* NOTIFICATION MODAL */}
      <Modal visible={notifVisible} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setNotifVisible(false)}>
          <View style={styles.backdrop}>
            <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
          </View>
        </TouchableWithoutFeedback>
        <View style={styles.centerModalContainer}>
          <View style={styles.centerModal}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <Text style={styles.dialogText}>Manage push alerts and sound preferences.</Text>
            <Pressable onPress={() => setNotifVisible(false)} style={styles.dialogButton}>
              <Text style={styles.dialogButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* PRIVACY MODAL */}
      <Modal visible={privacyVisible} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setPrivacyVisible(false)}>
          <View style={styles.backdrop}>
            <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
          </View>
        </TouchableWithoutFeedback>
        <View style={styles.centerModalContainer}>
          <View style={styles.centerModal}>
            <Text style={styles.modalTitle}>Privacy</Text>
            <Text style={styles.dialogText}>Control who can view your profile and send messages.</Text>
            <Pressable onPress={() => setPrivacyVisible(false)} style={styles.dialogButton}>
              <Text style={styles.dialogButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function PhotoBox({ item, drag, isActive, pickImage }) {
  return (
    <ScaleDecorator>
      <TouchableOpacity onLongPress={drag} onPress={() => pickImage(item.id)} activeOpacity={0.85}>
        <View style={[styles.photoBox, { transform: [{ scale: isActive ? 1.06 : 1 }] }]}>
          <LinearGradient
            colors={item.uri ? ['#B9E6FF', '#DDF4FF'] : ['#EAF7FF', '#FFFFFF']}
            style={styles.photoInner}
          >
            {item.uri ? (
              <Image source={{ uri: item.uri }} style={styles.photo} resizeMode="cover" />
            ) : (
              <AntDesign name="plus" size={22} color="#5BC0F8" />
            )}
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </ScaleDecorator>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F6FF', alignItems: 'center' },
  cardContainer: {
    marginTop: 70,
    borderRadius: 30,
    overflow: 'hidden',
    width: CARD_W,
    height: CARD_H,
    backgroundColor: '#fff',
    shadowColor: '#5BC0F8',
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
  },
  heroImage: { width: '100%', height: '100%', borderRadius: 30 },
  heroFade: { position: 'absolute', bottom: 0, height: 160, width: '100%' },
  editButton: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: '#5BC0F8', width: 44, height: 44,
    borderRadius: 22, justifyContent: 'center', alignItems: 'center',
  },
  progressBarContainer: {
    position: 'absolute', bottom: 10, width: '100%',
    flexDirection: 'row', justifyContent: 'center', gap: 4,
  },
  progressBarDot: { width: 16, height: 3, borderRadius: 2, backgroundColor: '#5BC0F8' },
  infoSection: { width: CARD_W, marginTop: 30, marginBottom: 80 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 32, fontWeight: '800', color: '#063970', marginBottom: 6 },
  bio: { fontSize: 16, color: '#5C738A', lineHeight: 22, marginBottom: 16 },
  tagRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  tag: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(91,192,248,0.15)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
  },
  tagText: { color: '#063970', fontWeight: '700', textTransform: 'capitalize' },
  addTag: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(91,192,248,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  settings: { marginTop: 10 },
  settingsTitle: { fontSize: 20, fontWeight: '700', color: '#063970', marginBottom: 10 },
  settingsItem: { fontSize: 16, color: '#5C738A', marginBottom: 10 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#E8F6FF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '70%',
  },
  modalGrabber: {
    alignSelf: 'center', width: 44, height: 5, borderRadius: 3,
    backgroundColor: 'rgba(6,57,112,0.25)', marginBottom: 10,
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#063970', textAlign: 'center', marginBottom: 12 },
  gridContainer: { alignItems: 'center', justifyContent: 'center', paddingBottom: 28 },
  photoBox: {
    width: SCREEN_W * 0.26, height: SCREEN_W * 0.26, borderRadius: 16, margin: 8,
  },
  photoInner: { width: '100%', height: '100%', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  photo: { width: '100%', height: '100%', borderRadius: 16 },
  closeButton: { alignSelf: 'center', marginTop: 8 },
  tagModalContainer: { flex: 1, justifyContent: 'center' },
  tagModalContent: {
    backgroundColor: '#E8F6FF', marginHorizontal: 30,
    borderRadius: 24, padding: 20, maxHeight: '70%',
  },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  tagOption: {
    backgroundColor: 'rgba(91,192,248,0.2)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, margin: 4,
  },
  tagOptionText: { color: '#063970', fontWeight: '600', textTransform: 'capitalize' },
  centerModalContainer: { flex: 1, justifyContent: 'center' },
  centerModal: {
    backgroundColor: '#E8F6FF', marginHorizontal: 30,
    borderRadius: 24, padding: 24, alignItems: 'center',
  },
  dialogText: { fontSize: 16, color: '#063970', textAlign: 'center', marginVertical: 10 },
  dialogButton: {
    marginTop: 12, backgroundColor: '#5BC0F8',
    paddingHorizontal: 22, paddingVertical: 8, borderRadius: 10,
  },
  dialogButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  startButton: {
    marginTop: 30,
    marginBottom: 20,
  },
  startButtonGradient: {
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
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
})
