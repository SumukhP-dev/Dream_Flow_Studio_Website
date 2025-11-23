module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-modules-core|expo-font|expo-asset|expo-constants|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-markdown-display|msw|@mswjs|until-async|@open-draft|outvariant|strict-event-emitter|path-to-regexp)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/*.test.{ts,tsx}',
    '!**/*.spec.{ts,tsx}',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx', '**/?(*.)+(spec|test).ts', '**/?(*.)+(spec|test).tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/mocks/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^msw/node$': '<rootDir>/node_modules/msw/lib/node/index.js',
  },
};

