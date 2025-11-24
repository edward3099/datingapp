module.exports = {
  testRunner: 'jest-circus/runner',
  testEnvironment: require.resolve('detox/runners/jest/testEnvironment'),
  testMatch: ['**/?(*.)+(e2e).[jt]s'],
  setupFilesAfterEnv: [
    require.resolve('detox/runners/jest/adapter'),
    './jest.setup.js',
  ],
  reporters: ['detox/runners/jest/reporter'],
  globalSetup: require.resolve('detox/runners/jest/globalSetup'),
  globalTeardown: require.resolve('detox/runners/jest/globalTeardown'),
  verbose: true,
  testTimeout: 180000,
};

