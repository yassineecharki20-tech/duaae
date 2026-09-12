/**
 * Jest — pure-logic tests.
 *
 * `jest-expo` cannot be used on SDK 57 (its `react-server-dom-webpack` peer
 * wants React ^19.2.4 while the SDK pins 19.2.3), so this config runs plain
 * jest + babel-jest over the platform-independent layers: the content corpus,
 * the search engine, date/Arabic utilities, the share-card geometry and the
 * error/result types.
 *
 * Anything that pulls in React Native at import time (stores, services,
 * components) is covered by `npm run typecheck` and by the manual walkthrough
 * documented in docs/VERIFICATION.md instead of by half-mocked unit tests.
 */
module.exports = {
  displayName: 'logic',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['babel-jest', { configFile: './babel.config.js' }],
  },
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/tests/__mocks__/fileMock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(png|jpg|jpeg|gif|webp|wav|mp3|svg)$': '<rootDir>/tests/__mocks__/fileMock.js',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  clearMocks: true,
};
