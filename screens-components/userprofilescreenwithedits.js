import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
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
  ActivityIndicator,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import * as ImagePicker from 'expo-image-picker';
import TopNavBar from '../components/TopNavBar';
import { useAuth } from '../contexts/AuthContext';
import { profileService } from '../services/profileService';
import { logger } from '../utils/logger';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W * 0.94;
const CARD_H = CARD_W * 1.35;
const MAX_PHOTO_SLOTS = 10;
const MAX_TAGS = 6;
const MAX_NAME_LENGTH = 50;
const MAX_BIO_LENGTH = 500;
const FALLBACK_TAGS = [
  'music',
  'poetry',
  'travel',
  'art',
  'fitness',
  'food',
  'reading',
  'gaming',
  'movies',
  'pets',
  'fashion',
  'photography',
  'nature',
  'dance',
  'yoga',
  'coffee',
];
const FALLBACK_TAG_OPTIONS = FALLBACK_TAGS.map((tag) => ({ slug: tag, label: tag }));
const PLACEHOLDER_IMAGE = require('./assets/no-image-available.png');
const DEFAULT_NOTIFICATION_PREFS = {
  newMatches: true,
  newMessages: true,
  profileLikes: false,
  appAnnouncements: true,
};
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
    .join(', ');

const buildPhotoSlots = (avatarUrl, galleryUrls = []) => {
  const slots = [{ id: 'avatar', uri: avatarUrl || null, type: 'avatar' }];

  (galleryUrls || [])
    .filter(Boolean)
    .forEach((uri, idx) => {
      slots.push({ id: `gallery-${idx}`, uri, type: 'gallery' });
    });

  while (slots.length < MAX_PHOTO_SLOTS) {
    slots.push({ id: `empty-${slots.length}`, uri: null, type: 'gallery' });
  }

  return slots.slice(0, MAX_PHOTO_SLOTS);
};

const resolveImageSource = (photo) => {
  if (!photo || !photo.uri) {
    return PLACEHOLDER_IMAGE;
  }
  return { uri: photo.uri };
};

const normalizeInterests = (interests) => {
  if (!Array.isArray(interests)) return [];
  return interests
    .map((interest) => {
      if (!interest) return null;
      if (typeof interest === 'string') {
        return {
          slug: interest,
          label: interest.replace(/_/g, ' '),
        };
      }
      return {
        slug: interest.slug || interest.label?.toLowerCase(),
        label: interest.label || interest.slug,
      };
    })
    .filter((item) => item?.slug);
};

const normalizeNotificationPrefs = (prefs = {}) => ({
  newMatches:
    prefs.newMatches ??
    prefs.new_matches ??
    DEFAULT_NOTIFICATION_PREFS.newMatches,
  newMessages:
    prefs.newMessages ??
    prefs.new_messages ??
    DEFAULT_NOTIFICATION_PREFS.newMessages,
  profileLikes:
    prefs.profileLikes ??
    prefs.profile_likes ??
    DEFAULT_NOTIFICATION_PREFS.profileLikes,
  appAnnouncements:
    prefs.appAnnouncements ??
    prefs.app_announcements ??
    DEFAULT_NOTIFICATION_PREFS.appAnnouncements,
});

export default function UserProfileScreen() {
  const navigation = useNavigation();
  const { profile: authProfile, refreshProfile, signOut } = useAuth();

  const [photos, setPhotos] = useState(buildPhotoSlots(null, []));
  const photosRef = useRef(buildPhotoSlots(null, []));
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Create a wrapper for setPhotos that also updates the ref immediately
  // This ensures the ref always has the latest state, even during rapid updates
  const setPhotosAndRef = useCallback((newPhotos) => {
    if (typeof newPhotos === 'function') {
      // For functional updates: pass function to React's setState
      // React will call it with the current state, and we'll update the ref inside
      setPhotos((prev) => {
        const finalPhotos = newPhotos(prev);
        photosRef.current = finalPhotos; // Update ref with the new state
        return finalPhotos;
      });
    } else {
      // For direct value updates
      photosRef.current = newPhotos; // Update ref immediately
      setPhotos(newPhotos); // Update state
    }
  }, []);

  const [tagSelectorVisible, setTagSelectorVisible] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
  const [supportVisible, setSupportVisible] = useState(false);

  const [availableTags, setAvailableTags] = useState([]);
  const [tags, setTags] = useState([]);
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      }
    })();
  }, []);

  const initializeFromProfile = useCallback((profileObj) => {
    const normalizedProfile = {
      ...profileObj,
      notification_settings: normalizeNotificationPrefs(
        profileObj.notification_settings || profileObj.notificationSettings || {},
      ),
    };
    setProfileData(normalizedProfile);
    setDisplayName(profileObj.display_name || profileObj.first_name || '');
    setAge(profileObj.age ? String(profileObj.age) : '');
    setBio(profileObj.bio || '');
    setLocation(profileObj.location ? formatLocation(profileObj.location) : '');

    const avatarUri =
      profileObj.avatar_url || profileObj.avatarUrl || profileObj.avatar || null;
    const serverGalleryUris =
      profileObj.gallery_urls ||
      profileObj.galleryUrls ||
      profileObj.gallery ||
      [];
    const normalizedServerGallery = Array.isArray(serverGalleryUris) ? serverGalleryUris.filter(Boolean) : [];
    
    // Preserve any locally uploaded photos that haven't been saved to server yet
    // Merge server photos with current photos (current photos take precedence if they exist)
    const currentGalleryUris = photosRef.current
      .filter((photo) => photo.type === 'gallery' && photo.uri)
      .map((photo) => photo.uri);
    
    // Merge: start with current photos, then add any server photos not already in current
    const mergedGallery = [...currentGalleryUris];
    normalizedServerGallery.forEach((serverUri) => {
      if (!mergedGallery.includes(serverUri)) {
        mergedGallery.push(serverUri);
      }
    });
    
    // Use server avatar, or keep current if no server avatar
    const finalAvatar = avatarUri || (photosRef.current.find((p) => p.type === 'avatar')?.uri || null);
    
    const newSlots = buildPhotoSlots(finalAvatar, mergedGallery);
    
    logger.info('initializeFromProfile called', {
      avatarUri,
      serverGalleryCount: normalizedServerGallery.length,
      serverGalleryUrls: normalizedServerGallery,
      currentGalleryCount: currentGalleryUris.length,
      currentGalleryPhotos: currentGalleryUris,
      mergedGalleryCount: mergedGallery.length,
      mergedGalleryUrls: mergedGallery,
    });
    
    setPhotosAndRef(newSlots);

    const rawTags =
      (Array.isArray(profileObj.tags) && profileObj.tags.length ? profileObj.tags : null) ||
      (Array.isArray(profileObj.interests) && profileObj.interests.length
        ? profileObj.interests
        : []);
    const normalizedTags = rawTags
      .map((tag) => {
        if (!tag) return null;
        if (typeof tag === 'string') return tag;
        if (typeof tag.slug === 'string') return tag.slug;
        if (typeof tag.name === 'string') return tag.name;
        return null;
      })
      .filter(Boolean);
    setTags(Array.from(new Set(normalizedTags)));
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setLoadingProfile(true);
      setLoadError(null);
      try {
        const [{ profile: myProfile, error: profileError }, { interests, error: interestsError }] =
          await Promise.all([profileService.getMyProfile(), profileService.getInterests()]);

        if (profileError) throw profileError;
        if (interestsError) throw interestsError;

        if (!isMounted) return;

        const normalized = normalizeInterests(interests);
        setAvailableTags(normalized.length ? normalized : FALLBACK_TAG_OPTIONS);

        const sourceProfile = myProfile || authProfile || null;
        if (sourceProfile) {
          initializeFromProfile(sourceProfile);
        } else {
          const emptySlots = buildPhotoSlots(null, []);
          setPhotosAndRef(emptySlots);
          setTags([]);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error);
          logger.error('User profile load error', {
            error: error?.message || String(error),
            stack: error?.stack,
          });
        }
      } finally {
        if (isMounted) {
          setLoadingProfile(false);
        }
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [authProfile, initializeFromProfile]);

  const filledPhotos = useMemo(() => photos.filter((photo) => !!photo.uri), [photos]);
  const carouselPhotos = filledPhotos.length ? filledPhotos : photos.length ? [photos[0]] : [];

  useEffect(() => {
    if (!carouselPhotos.length) {
      setCurrentPhoto(0);
      return;
    }
    if (currentPhoto >= carouselPhotos.length) {
      setCurrentPhoto(0);
    }
  }, [carouselPhotos.length, currentPhoto]);

  const switchImage = (dir) => {
    if (carouselPhotos.length <= 1) return;
    let next = currentPhoto + dir;
    if (next < 0) next = carouselPhotos.length - 1;
    if (next >= carouselPhotos.length) next = 0;
    Animated.timing(slideAnim, {
      toValue: -dir * CARD_W,
      duration: 140,
      useNativeDriver: false,
    }).start(() => {
      setCurrentPhoto(next);
      slideAnim.setValue(dir * CARD_W);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: false,
      }).start();
    });
  };

  const handleReorder = ({ data }) => {
    const avatar = data.find((item) => item.type === 'avatar');
    const galleryUris = data
      .filter((item) => item.type === 'gallery' && item.uri)
      .map((item) => item.uri);
    const newSlots = buildPhotoSlots(avatar?.uri || null, galleryUris);
    setPhotosAndRef(newSlots);
  };

  const pickImage = async (item) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
      });
      if (result.canceled) return;
      const assetUri = result.assets?.[0]?.uri;
      if (!assetUri) return;

      const { url, error } = await profileService.uploadProfileImage(
        assetUri,
        item.type === 'avatar',
      );
      if (error) throw error;

      if (!url) {
        throw new Error('Upload succeeded but no URL returned');
      }

      // Use functional setState to always work with the latest state
      setPhotosAndRef((prev) => {
        logger.info('Inside setState callback', {
          prevPhotosCount: prev.length,
          prevPhotos: prev.map((p) => ({ id: p.id, type: p.type, hasUri: !!p.uri, uri: p.uri?.substring(0, 50) + '...' })),
        });

        // Get current avatar
        const currentAvatarPhoto = prev.find((photo) => photo.type === 'avatar');
        let nextAvatar = currentAvatarPhoto?.uri || null;

        // Collect ALL existing gallery URLs (this should have all previous uploads)
        const existingGalleryUrls = prev
          .filter((photo) => photo.type === 'gallery' && photo.uri)
          .map((photo) => photo.uri);

        if (item.type === 'avatar') {
          // Replace avatar, keep all existing gallery photos
          nextAvatar = url;
          const newSlots = buildPhotoSlots(nextAvatar, existingGalleryUrls);
          logger.info('Photos updated after avatar upload', {
            nextAvatar,
            galleryCount: existingGalleryUrls.length,
            totalSlots: newSlots.length,
            galleryUrls: existingGalleryUrls,
          });
          return newSlots;
        }
        
        // For gallery uploads: add new URL to existing ones
        logger.info('Before collecting gallery URLs', {
          existingUrls: existingGalleryUrls,
          count: existingGalleryUrls.length,
        });

        // Add the new gallery photo URL (avoid duplicates)
        const allGalleryUrls = [...existingGalleryUrls];
        if (!allGalleryUrls.includes(url)) {
          allGalleryUrls.push(url);
        }

        logger.info('Collected existing gallery URLs', {
          existingUrls: existingGalleryUrls,
          newUrl: url,
          allUrls: allGalleryUrls,
          count: allGalleryUrls.length,
        });

        // Rebuild all photo slots with the complete gallery
        const newSlots = buildPhotoSlots(nextAvatar, allGalleryUrls);
        logger.info('Photos updated after gallery upload', {
          nextAvatar,
          newUrl: url,
          galleryCount: allGalleryUrls.length,
          totalSlots: newSlots.length,
          galleryUrls: allGalleryUrls,
          newSlotsPreview: newSlots.map((slot) => ({ id: slot.id, hasUri: !!slot.uri, type: slot.type })),
        });
        
        return newSlots;
      });
    } catch (error) {
      logger.error('Profile image upload error', {
        error: error?.message || String(error),
        stack: error?.stack,
      });
      Alert.alert('Upload Failed', 'We could not upload that photo. Please try again.');
    }
  };

  const handleDeleteTag = (slug) => {
    setTags((prev) => prev.filter((tag) => tag !== slug));
  };

  const handleAddTag = (slug) => {
    if (tags.includes(slug) || tags.length >= MAX_TAGS) return;
    setTags((prev) => [...prev, slug]);
    setTagSelectorVisible(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const avatarPhoto = photos.find((photo) => photo.type === 'avatar');
      const galleryUris = photos
        .filter((photo) => photo.type === 'gallery' && photo.uri)
        .map((photo) => photo.uri);
      const notificationPrefsToSave = normalizeNotificationPrefs(
        profileData?.notification_settings || {},
      );

      const updates = {
        display_name: displayName && displayName.length <= MAX_NAME_LENGTH ? displayName : (displayName ? displayName.slice(0, MAX_NAME_LENGTH) : null),
        age: age ? Number(age) : null,
        bio: bio && bio.length <= MAX_BIO_LENGTH ? bio : (bio ? bio.slice(0, MAX_BIO_LENGTH) : null),
        location: location ? formatLocation(location) : null,
        avatar_url: avatarPhoto?.uri || null,
        gallery_urls: galleryUris,
        tags,
        notification_settings: notificationPrefsToSave,
      };

      const { profile: updatedProfile, error: updateError } = await profileService.updateProfile(
        updates,
      );
      if (updateError) throw updateError;

      const { error: interestsError } = await profileService.updateInterests(tags);
      if (interestsError) throw interestsError;

      await refreshProfile?.();
      if (updatedProfile) {
        initializeFromProfile(updatedProfile);
      }
      Alert.alert('Profile Updated', 'Your profile changes have been saved.');
    } catch (error) {
      logger.error('Profile save error', {
        error: error?.message || String(error),
        stack: error?.stack,
      });
      Alert.alert('Save Failed', 'We couldn’t save your changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = useCallback(() => {
    if (loggingOut) return;

    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            const { error } = await signOut();
            if (error) {
              throw error;
            }
          } catch (error) {
            logger.error('Logout error', {
              error: error?.message || String(error),
              stack: error?.stack,
            });
            Alert.alert('Logout failed', 'We could not sign you out. Please try again.');
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  }, [loggingOut, signOut]);

  const computedName = useMemo(() => {
    const nameParts = [];
    if (displayName) nameParts.push(displayName);
    const numericAge = Number(age);
    if (!Number.isNaN(numericAge) && numericAge > 0) {
      nameParts.push(numericAge);
    }
    return nameParts.length > 0 ? nameParts.join(', ') : 'Add your profile details';
  }, [displayName, age]);

  const getTagLabel = useCallback(
    (slug) => availableTags.find((tag) => tag.slug === slug)?.label || slug,
    [availableTags],
  );

  const currentNotificationPrefs = profileData
    ? normalizeNotificationPrefs(profileData.notification_settings || {})
    : DEFAULT_NOTIFICATION_PREFS;

  const handleToggleNotification = (key) => {
    setProfileData((prev) => {
      const previousPrefs = normalizeNotificationPrefs(prev?.notification_settings || {});
      const nextPrefs = {
        ...previousPrefs,
        [key]: !previousPrefs[key],
      };
      if (!prev) {
        return { notification_settings: nextPrefs };
      }
      return {
        ...prev,
        notification_settings: nextPrefs,
      };
    });
  };

  const metrics = useMemo(() => {
    const meta = profileData?.compatibility_metrics || profileData?.metrics;
    if (!meta) return null;

    const normalizeMetric = (value) => {
      if (value === null || value === undefined) return null;
      const num = typeof value === 'number' ? value : Number(value);
      if (Number.isNaN(num)) return null;
      const scaled = num > 1 ? num : num * 100;
      return Math.max(0, Math.min(100, Math.round(scaled)));
    };

    const activity =
      normalizeMetric(
        meta.activity ?? meta.activity_score ?? meta.activityScore ?? meta.red_flag ?? meta.redFlag
      );
    const banter = normalizeMetric(meta.banter ?? meta.banter_score ?? meta.banterScore);
    const ghost = normalizeMetric(meta.ghost ?? meta.ghost_score ?? meta.ghostScore);

    if (activity === null && banter === null && ghost === null) return null;

    return { activity, banter, ghost };
  }, [profileData]);

  const heroPhoto = carouselPhotos[currentPhoto] || carouselPhotos[0] || null;

  if (loadingProfile) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#E8F6FF', '#FFFFFF']} style={StyleSheet.absoluteFill} />
        <TopNavBar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5BC0F8" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#E8F6FF', '#FFFFFF']} style={StyleSheet.absoluteFill} />
      <TopNavBar />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center', paddingTop: 70, paddingBottom: 120 }}
      >
        {loadError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>
              We couldn’t load your full profile. Some information may be missing.
            </Text>
          </View>
        )}

        <View style={styles.cardContainer}>
          <TouchableWithoutFeedback
            onPress={(e) => {
              if (carouselPhotos.length <= 1) return;
              const x = e.nativeEvent.locationX;
              if (x > CARD_W / 2) switchImage(1);
              else switchImage(-1);
            }}
            onLongPress={() => pickImage(heroPhoto || photos[0])}
          >
            <Animated.View
              style={{
                transform: [{ translateX: slideAnim }],
              }}
            >
              <Image source={resolveImageSource(heroPhoto)} style={styles.heroImage} />
            </Animated.View>
          </TouchableWithoutFeedback>

          <LinearGradient colors={['transparent', 'rgba(255,255,255,0.9)']} style={styles.heroFade} />

          <Pressable style={styles.editButton} onPress={() => setGalleryVisible(true)}>
            <AntDesign name="edit" size={26} color="#fff" />
          </Pressable>

          <View style={styles.progressBarContainer}>
            {carouselPhotos.map((photo, index) => (
              <View
                key={photo.id}
                style={[styles.progressBarDot, { opacity: index === currentPhoto ? 1 : 0.3 }]}
              />
            ))}
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{computedName}</Text>
          </View>

          <View style={styles.tagRow}>
            {tags.map((slug) => (
              <View key={slug} style={styles.tag}>
                <Text style={styles.tagText}>{getTagLabel(slug)}</Text>
                <Pressable onPress={() => handleDeleteTag(slug)} hitSlop={8}>
                  <AntDesign name="close" size={12} color="#063970" style={{ marginLeft: 4 }} />
                </Pressable>
              </View>
            ))}
            {tags.length < MAX_TAGS && (
              <Pressable onPress={() => setTagSelectorVisible(true)}>
                <View style={styles.addTag}>
                  <AntDesign name="plus" size={16} color="#063970" />
                </View>
              </Pressable>
            )}
          </View>

          <View style={styles.bioRow}>
            {isEditingBio ? (
              <View style={{ flex: 1 }}>
                <TextInput
                  style={[styles.bioInput, { flex: 1 }]}
                  value={bio}
                  onChangeText={(value) => {
                    if (value.length <= MAX_BIO_LENGTH) {
                      setBio(value);
                    }
                  }}
                  multiline
                  placeholder="Add a short bio to share your vibe."
                  placeholderTextColor="#9CB8CC"
                  autoFocus
                  onBlur={() => setIsEditingBio(false)}
                  maxLength={MAX_BIO_LENGTH}
                />
                <Text style={styles.characterCount}>
                  {bio.length}/{MAX_BIO_LENGTH}
                </Text>
              </View>
            ) : (
              <Text style={styles.bioText}>{bio || 'Add a short bio to share your vibe.'}</Text>
            )}
            {!isEditingBio && (
              <Pressable style={styles.bioEditButton} onPress={() => setIsEditingBio(true)}>
                <AntDesign name="edit" size={20} color="#5BC0F8" />
              </Pressable>
            )}
          </View>
          <View style={styles.locationRow}>
            <Text style={styles.locationLabel}>Location</Text>
            <View style={styles.locationDisplay}>
              <Text style={styles.locationText}>
                {location ? formatLocation(location) : 'No location yet'}
              </Text>
            </View>
          </View>

          {metrics ? (
            <View style={styles.metricsContainer}>
              <Metric label="Activity" color="#FF6B6B" value={metrics.activity} />
              <Metric label="Banter" color="#5BC0F8" value={metrics.banter} />
              <Metric label="Ghost" color="#9B59B6" value={metrics.ghost} />
            </View>
          ) : (
            <Text style={styles.metricsPlaceholder}>
              Keep connecting to unlock compatibility insights.
            </Text>
          )}

          <View style={styles.settings}>
            <Text style={styles.settingsTitle}>Settings</Text>
            <Pressable onPress={() => setNotifVisible(true)}>
              <Text style={styles.settingsItem}>Notifications</Text>
            </Pressable>
            <Pressable onPress={() => setPrivacyVisible(true)}>
              <Text style={styles.settingsItem}>Privacy</Text>
            </Pressable>
          <Pressable onPress={() => setTermsVisible(true)}>
            <Text style={styles.settingsItem}>Terms of Use / EULA</Text>
          </Pressable>
          <Pressable onPress={() => setSupportVisible(true)}>
            <Text style={styles.settingsItem}>Support</Text>
          </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar} pointerEvents={saving || loggingOut ? 'none' : 'auto'}>
        <LinearGradient colors={['rgba(232,246,255,0.95)', '#E8F6FF']} style={styles.bottomBarGradient}>
          <Pressable
            onPress={handleLogout}
            style={[styles.logoutButton, loggingOut && { opacity: 0.7 }]}
            disabled={loggingOut}
          >
            <Text style={styles.logoutButtonText}>{loggingOut ? 'Logging out…' : 'Log Out'}</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            style={[styles.saveButtonLarge, saving && { opacity: 0.7 }]}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save Profile'}</Text>
          </Pressable>
        </LinearGradient>
      </View>

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
                keyExtractor={(item) => item.id}
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

      <Modal visible={termsVisible} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setTermsVisible(false)}>
          <View style={styles.backdrop}>
            <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
          </View>
        </TouchableWithoutFeedback>
        <View style={styles.centerModalContainer}>
          <View style={styles.privacyModal}>
            <View style={styles.modalGrabber} />
            <Text style={styles.modalTitle}>Terms of Use & EULA</Text>
            <ScrollView
              style={styles.policyScroll}
              contentContainerStyle={styles.policyContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.policySection}>
                <Text style={styles.policyHeading}>Acceptance</Text>
                <Text style={styles.policyBody}>
                  By creating an account you confirm that you are at least 18 years old and you agree to follow these Terms of Use and the End User License Agreement. If you disagree with any part, please delete your account and discontinue using the app.
                </Text>
              </View>
              <View style={styles.policySection}>
                <Text style={styles.policyHeading}>License</Text>
                <Text style={styles.policyBody}>
                  We grant you a personal, revocable, non-transferable license to use the app for matchmaking and communication. Reverse engineering, automated scraping, or reselling access is prohibited. We reserve the right to suspend accounts that violate these rules.
                </Text>
              </View>
              <View style={styles.policySection}>
                <Text style={styles.policyHeading}>User Conduct</Text>
                <Text style={styles.policyBody}>
                  Treat others with respect. Do not upload illegal content, spam, or impersonate others. We may remove content or block accounts that breach community guidelines, with or without notice.
                </Text>
              </View>
              <View style={styles.policySection}>
                <Text style={styles.policyHeading}>Liability</Text>
                <Text style={styles.policyBody}>
                  CloseCircle facilitates introductions but does not guarantee matches or outcomes. Use discretion when engaging with other members. We are not responsible for offline interactions—report unsafe behavior immediately so we can investigate.
                </Text>
              </View>
              <View style={styles.policySection}>
                <Text style={styles.policyHeading}>Updates</Text>
                <Text style={styles.policyBody}>
                  We update these terms periodically. Continuing to use the app after updates take effect means you accept the revised terms. Check Settings › Help › Terms for the latest version.
                </Text>
              </View>
            </ScrollView>
            <View style={styles.policyFooter}>
              <Pressable onPress={() => setTermsVisible(false)} style={styles.policyCloseButton}>
                <Text style={styles.policyCloseText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={supportVisible} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setSupportVisible(false)}>
          <View style={styles.backdrop}>
            <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
          </View>
        </TouchableWithoutFeedback>
        <View style={styles.centerModalContainer}>
          <View style={styles.privacyModal}>
            <View style={styles.modalGrabber} />
            <Text style={styles.modalTitle}>Support</Text>
            <ScrollView
              style={styles.policyScroll}
              contentContainerStyle={styles.policyContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.policySection}>
                <Text style={styles.policyHeading}>Need a Hand?</Text>
                <Text style={styles.policyBody}>
                  Our support team is here seven days a week. The fastest way to get help is through the in-app support form or by emailing support@closecircle.app. We aim to respond within 24 hours.
                </Text>
              </View>
              <View style={styles.policySection}>
                <Text style={styles.policyHeading}>Report & Safety</Text>
                <Text style={styles.policyBody}>
                  Encountered something concerning? Use the “Report” button on the profile or message thread. Include as much detail as possible and we’ll investigate promptly while keeping your identity confidential.
                </Text>
              </View>
              <View style={styles.policySection}>
                <Text style={styles.policyHeading}>Billing & Subscriptions</Text>
                <Text style={styles.policyBody}>
                  For premium plans purchased through the app store, manage or cancel your subscription in the store’s account settings. For questions about charges, contact us with your receipt and we’ll assist.
                </Text>
              </View>
              <View style={styles.policySection}>
                <Text style={styles.policyHeading}>Account Recovery</Text>
                <Text style={styles.policyBody}>
                  Locked out or need to restore your account? Provide the email or phone number tied to your profile and we’ll send recovery steps. For security reasons, we may ask for additional verification.
                </Text>
              </View>
              <View style={styles.policySection}>
                <Text style={styles.policyHeading}>Community Resources</Text>
                <Text style={styles.policyBody}>
                  For dating safety tips and FAQs, visit closecircle.app/help. You’ll find guides on first-meet safety, conversation starters, and navigating matches respectfully.
                </Text>
              </View>
            </ScrollView>
            <View style={styles.policyFooter}>
              <Pressable onPress={() => setSupportVisible(false)} style={styles.policyCloseButton}>
                <Text style={styles.policyCloseText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={tagSelectorVisible} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setTagSelectorVisible(false)}>
          <View style={styles.backdrop}>
            <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
          </View>
        </TouchableWithoutFeedback>
        <View style={styles.tagModalContainer} pointerEvents="box-none">
          <View style={styles.tagModalContent}>
            <Text style={styles.modalTitle}>Select interests</Text>
            <ScrollView contentContainerStyle={styles.tagGrid} showsVerticalScrollIndicator={false}>
              {availableTags.map((tag) => {
                const disabled = tags.includes(tag.slug) || tags.length >= MAX_TAGS;
                return (
                  <Pressable
                    key={tag.slug}
                    onPress={() => handleAddTag(tag.slug)}
                    disabled={disabled}
                  >
                    <View style={[styles.tagOption, disabled && { opacity: 0.35 }]}>
                      <Text style={styles.tagOptionText}>{tag.label}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={notifVisible} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setNotifVisible(false)}>
          <View style={styles.backdrop}>
            <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
          </View>
        </TouchableWithoutFeedback>
        <View style={styles.centerModalContainer}>
          <View style={styles.centerModal}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <Text style={styles.dialogText}>
              Choose which alerts you’d like to receive. These preferences sync across devices once you save your profile.
            </Text>
            <View style={styles.notificationSection}>
              <View style={styles.notificationRow}>
                <View style={styles.notificationCopy}>
                  <Text style={styles.notificationLabel}>New matches</Text>
                  <Text style={styles.notificationCaption}>Get a heads up as soon as someone matches with you.</Text>
                </View>
                <Switch
                  value={currentNotificationPrefs.newMatches}
                  onValueChange={() => handleToggleNotification('newMatches')}
                  thumbColor={currentNotificationPrefs.newMatches ? '#5BC0F8' : '#E2E8F0'}
                  trackColor={{ false: '#CBD5E1', true: 'rgba(91,192,248,0.35)' }}
                />
              </View>
              <View style={styles.notificationRow}>
                <View style={styles.notificationCopy}>
                  <Text style={styles.notificationLabel}>New messages</Text>
                  <Text style={styles.notificationCaption}>Stay in the loop when chats heat up.</Text>
                </View>
                <Switch
                  value={currentNotificationPrefs.newMessages}
                  onValueChange={() => handleToggleNotification('newMessages')}
                  thumbColor={currentNotificationPrefs.newMessages ? '#5BC0F8' : '#E2E8F0'}
                  trackColor={{ false: '#CBD5E1', true: 'rgba(91,192,248,0.35)' }}
                />
              </View>
              <View style={styles.notificationRow}>
                <View style={styles.notificationCopy}>
                  <Text style={styles.notificationLabel}>Profile likes</Text>
                  <Text style={styles.notificationCaption}>See when you’re added to someone’s favourites.</Text>
                </View>
                <Switch
                  value={currentNotificationPrefs.profileLikes}
                  onValueChange={() => handleToggleNotification('profileLikes')}
                  thumbColor={currentNotificationPrefs.profileLikes ? '#5BC0F8' : '#E2E8F0'}
                  trackColor={{ false: '#CBD5E1', true: 'rgba(91,192,248,0.35)' }}
                />
              </View>
              <View style={styles.notificationRow}>
                <View style={styles.notificationCopy}>
                  <Text style={styles.notificationLabel}>Announcements</Text>
                  <Text style={styles.notificationCaption}>Product updates, feature drops, and special events.</Text>
                </View>
                <Switch
                  value={currentNotificationPrefs.appAnnouncements}
                  onValueChange={() => handleToggleNotification('appAnnouncements')}
                  thumbColor={currentNotificationPrefs.appAnnouncements ? '#5BC0F8' : '#E2E8F0'}
                  trackColor={{ false: '#CBD5E1', true: 'rgba(91,192,248,0.35)' }}
                />
              </View>
            </View>
            <Pressable onPress={() => setNotifVisible(false)} style={styles.dialogButton}>
              <Text style={styles.dialogButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={privacyVisible} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setPrivacyVisible(false)}>
          <View style={styles.backdrop}>
            <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
          </View>
        </TouchableWithoutFeedback>
        <View style={styles.centerModalContainer}>
          <View style={styles.privacyModal}>
            <View style={styles.modalGrabber} />
            <Text style={styles.modalTitle}>Privacy</Text>
            <ScrollView
              style={styles.policyScroll}
              contentContainerStyle={styles.policyContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.policySection}>
                <Text style={styles.policyHeading}>What We Collect</Text>
                <Text style={styles.policyBody}>
                  We store the basics needed to run your profile: name, age, photos, location you provide, and the preferences you set in this profile screen. Messaging activity is retained so you can revisit conversations, but your private chats are never shared publicly.
                </Text>
              </View>
              <View style={styles.policySection}>
                <Text style={styles.policyHeading}>How It’s Used</Text>
                <Text style={styles.policyBody}>
                  Data fuels matchmaking and safety. Your details help us recommend relevant profiles, surface compatibility metrics, and keep the community secure. We never sell your personal information. Third-party providers only process data to deliver our app services (analytics, storage, verification) under strict confidentiality agreements.
                </Text>
              </View>
              <View style={styles.policySection}>
                <Text style={styles.policyHeading}>Your Controls</Text>
                <Text style={styles.policyBody}>
                  You can update or delete your profile at any time from this screen. Turning off optional fields (bio, interests, gallery) removes them immediately from view. Need a copy of your data or want it erased? Contact support through Settings › Help and we’ll handle the request within 30 days.
                </Text>
              </View>
              <View style={styles.policySection}>
                <Text style={styles.policyHeading}>Staying Safe</Text>
                <Text style={styles.policyBody}>
                  We automatically monitor for suspicious behavior and rely on community reports to protect members. If you encounter harassment or suspect misuse, block the profile and report it—our trust team reviews every report and can remove offending accounts.
                </Text>
              </View>
              <View style={styles.policySection}>
                <Text style={styles.policyHeading}>Questions?</Text>
                <Text style={styles.policyBody}>
                  Review the full privacy statement in Settings › Help › Privacy Policy. You can also email privacy@closecircle.app for personalized assistance.
                </Text>
              </View>
            </ScrollView>
            <View style={styles.policyFooter}>
              <Pressable onPress={() => setPrivacyVisible(false)} style={styles.policyCloseButton}>
                <Text style={styles.policyCloseText}>Got it</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Metric({ label, color, value }) {
  const hasValue = value !== null && value !== undefined;
  const display = hasValue ? `${value}%` : '–';

  return (
    <View style={styles.metricItem}>
      <Text style={styles.metricLabel}>{label}</Text>
      {hasValue ? <View style={[styles.metricGlow, { backgroundColor: color }]} /> : <View style={[styles.metricGlow, { backgroundColor: 'transparent' }]} />}
      <Text style={styles.metricValue}>{display}</Text>
    </View>
  );
}

function PhotoBox({ item, drag, isActive, pickImage }) {
  const canDrag = item.type === 'gallery' && item.uri;

  return (
    <ScaleDecorator>
      <TouchableOpacity
        onLongPress={canDrag ? drag : undefined}
        onPress={() => pickImage(item)}
        activeOpacity={0.85}
      >
        <View style={[styles.photoBox, { transform: [{ scale: isActive ? 1.06 : 1 }] }]}>
          <LinearGradient
            colors={item.uri ? ['#B9E6FF', '#DDF4FF'] : ['#EAF7FF', '#FFFFFF']}
            style={styles.photoInner}
          >
            {item.uri ? (
              <Image 
                key={`${item.id}-${item.uri}`} 
                source={{ uri: item.uri }} 
                style={styles.photo} 
                resizeMode="cover"
                onError={(e) => {
                  logger.error('Image load error', {
                    uri: item.uri,
                    itemId: item.id,
                    error: e.nativeEvent?.error,
                  });
                }}
                onLoad={() => {
                  logger.info('Image loaded successfully', {
                    uri: item.uri?.substring(0, 50) + '...',
                    itemId: item.id,
                  });
                }}
              />
            ) : (
              <AntDesign name="plus" size={22} color="#5BC0F8" />
            )}
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </ScaleDecorator>
  );
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
  bioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bioText: {
    flex: 1,
    fontSize: 16,
    color: '#5C738A',
    lineHeight: 22,
  },
  bioInput: {
    fontSize: 16,
    color: '#063970',
    lineHeight: 22,
    backgroundColor: 'rgba(91,192,248,0.12)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlignVertical: 'top',
    minHeight: 96,
  },
  bioEditButton: {
    marginLeft: 12,
    padding: 10,
  },
  characterCount: {
    fontSize: 12,
    color: '#9CB8CC',
    marginTop: 6,
    textAlign: 'right',
  },
  locationRow: {
    marginTop: 12,
    marginBottom: 20,
    padding: 20,
    borderRadius: 22,
    backgroundColor: 'rgba(91,192,248,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(91,192,248,0.15)',
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#063970',
    marginBottom: 12,
  },
  locationDisplay: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(91,192,248,0.35)',
  },
  locationText: {
    fontSize: 16,
    color: '#5C738A',
    textTransform: 'capitalize',
  },
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
  notificationSection: {
    width: '100%',
    marginTop: 12,
    marginBottom: 16,
    gap: 14,
  },
  notificationRow: {
    backgroundColor: 'rgba(91,192,248,0.12)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationCopy: {
    flex: 1,
    paddingRight: 12,
  },
  notificationLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#063970',
    marginBottom: 4,
  },
  notificationCaption: {
    fontSize: 13,
    color: '#446077',
  },
  policyScroll: {
    width: '100%',
    marginTop: 8,
    marginBottom: 8,
  },
  policyContent: {
    paddingBottom: 4,
    gap: 14,
  },
  policySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(91,192,248,0.18)',
    shadowColor: '#063970',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  policyHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#063970',
    marginBottom: 6,
  },
  policyBody: {
    fontSize: 14,
    color: '#446077',
    lineHeight: 20,
  },
  privacyModal: {
    marginHorizontal: 24,
    marginTop: 'auto',
    marginBottom: Platform.select({ ios: 40, android: 28, default: 32 }),
    backgroundColor: '#F5FAFF',
    borderRadius: 26,
    paddingVertical: 18,
    paddingHorizontal: 20,
    shadowColor: '#063970',
    shadowOpacity: 0.12,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    maxHeight: '80%',
  },
  policyFooter: {
    marginTop: 12,
    alignItems: 'center',
  },
  policyCloseButton: {
    backgroundColor: '#5BC0F8',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 14,
  },
  policyCloseText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginBottom: 20,
  },
  metricsPlaceholder: {
    marginTop: 20,
    marginBottom: 20,
    textAlign: 'center',
    color: '#5C738A',
    fontSize: 14,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 14,
    color: '#5C738A',
    marginBottom: 5,
  },
  metricGlow: {
    width: 60,
    height: 10,
    borderRadius: 5,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#063970',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomBarGradient: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.select({ ios: 28, android: 24, default: 24 }),
    alignItems: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  logoutButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginRight: 12,
    flex: 1,
    alignItems: 'center',
  },
  logoutButtonText: {
     color: '#fff',
     fontSize: 16,
     fontWeight: '700',
   },
   saveButtonLarge: {
     backgroundColor: '#5BC0F8',
     borderRadius: 16,
     paddingVertical: 16,
     paddingHorizontal: 32,
     alignItems: 'center',
     flex: 1,
     marginLeft: 12,
   },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F6FF',
  },
  loadingText: {
    marginTop: 10,
    color: '#5C738A',
    fontSize: 16,
  },
  errorBanner: {
    backgroundColor: '#FFE5E5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
    alignSelf: 'center',
  },
  errorBannerText: {
    color: '#D32F2F',
    fontSize: 14,
    textAlign: 'center',
  },
});

