/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    type: 'jest',
    jest: {
      setupTimeout: 180000,
    },
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
  },
  behavior: {
    init: {
      exposeGlobals: true,
    },
  },
  apps: {
    'ios.sim.debug': {
      type: 'ios.app',
      build: [
        'EXPO_NO_DOCTOR=1 npx expo prebuild --platform ios --clean --non-interactive',
        'cd ios && xcodebuild -workspace "ExpoGoApp.xcworkspace" -scheme "ExpoGoApp" -configuration Debug -sdk iphonesimulator -derivedDataPath build -UseModernBuildSystem=YES',
      ].join(' && '),
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/ExpoGoApp.app',
    },
    'android.emu.debug': {
      type: 'android.apk',
      build: [
        'EXPO_NO_DOCTOR=1 npx expo prebuild --platform android --clean --non-interactive',
        'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
      ].join(' && '),
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      testBinaryPath: 'android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 16 Pro',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_7_API_34',
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.sim.debug',
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.emu.debug',
    },
  },
};

