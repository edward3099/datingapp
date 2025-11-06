import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { logger } from '../utils/logger';

export default function DevMenu() {
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation();

  // Triple tap to open dev menu
  const [tapCount, setTapCount] = useState(0);
  const [lastTap, setLastTap] = useState(0);

  const handleTripleTap = () => {
    const now = Date.now();
    if (now - lastTap < 500) {
      const newCount = tapCount + 1;
      setTapCount(newCount);
      if (newCount >= 2) {
        setVisible(true);
        setTapCount(0);
      }
    } else {
      setTapCount(1);
    }
    setLastTap(now);
  };

  const openDebugScreen = () => {
    setVisible(false);
    navigation.navigate('Debug');
  };

  const testError = () => {
    logger.error('Test Error', { message: 'This is a test error for debugging' });
    setVisible(false);
  };

  const testWarning = () => {
    logger.warn('Test Warning', { message: 'This is a test warning' });
    setVisible(false);
  };

  return (
    <>
      <Pressable 
        style={styles.trigger}
        onPress={handleTripleTap}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <View style={styles.dot} />
      </Pressable>

      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setVisible(false)}>
          <View style={styles.menu} onStartShouldSetResponder={() => true}>
            <Text style={styles.menuTitle}>🐛 Dev Menu</Text>
            
            <Pressable style={styles.menuItem} onPress={openDebugScreen}>
              <Text style={styles.menuItemText}>📊 View Debug Console</Text>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={testError}>
              <Text style={styles.menuItemText}>❌ Test Error Log</Text>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={testWarning}>
              <Text style={styles.menuItemText}>⚠️ Test Warning Log</Text>
            </Pressable>

            <Pressable style={[styles.menuItem, styles.closeButton]} onPress={() => setVisible(false)}>
              <Text style={styles.menuItemText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 9999,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  menuItem: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginBottom: 8,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    backgroundColor: '#FF4C4C',
    marginTop: 8,
  },
  closeButtonText: {
    color: '#fff',
  },
});
