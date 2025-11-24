import 'react-native-gesture-handler/jestSetup';

let setUpReanimatedTests = () => {};
try {
  ({ setUpTests: setUpReanimatedTests } = require('react-native-reanimated/lib/reanimated2/jestUtils'));
} catch {
  try {
    ({ setUpTests: setUpReanimatedTests } = require('react-native-reanimated/lib/module/reanimated2/jestUtils'));
  } catch {
    // Reanimated not installed or path changed; leave as no-op.
  }
}

// Ensure Reanimated mocks are configured before each test suite
setUpReanimatedTests?.();

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

try {
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
} catch (error) {
  // Module path changed in newer releases; ignore if unavailable.
}

// Provide a basic mock for the Supabase client to prevent network calls in tests
jest.mock('@supabase/supabase-js', () => {
  const actual = jest.requireActual('@supabase/supabase-js');
  return {
    ...actual,
    createClient: () => {
      const authApi = {
        signInWithPassword: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
        signUp: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
        signOut: jest.fn().mockResolvedValue({ error: null }),
        resend: jest.fn().mockResolvedValue({ error: null }),
        getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
      };

      const client = {
        auth: authApi,
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          update: jest.fn().mockResolvedValue({ data: null, error: null }),
          delete: jest.fn().mockResolvedValue({ data: null, error: null }),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
        rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
        storage: {
          from: jest.fn().mockReturnValue({
            upload: jest.fn().mockResolvedValue({ data: null, error: null }),
            getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: '' }, error: null }),
            remove: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        },
      };

      return client;
    },
  };
});

// Avoid noisy console.error/console.warn output during tests while still recording logs
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

if (typeof beforeAll === 'function' && typeof afterAll === 'function') {
  beforeAll(() => {
    console.error = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('Use React Native GestureHandlerRootView')) return;
      originalConsoleError(...args);
    };

    console.warn = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('componentWillReceiveProps')) return;
      originalConsoleWarn(...args);
    };
  });

  afterAll(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });
}

