/**
 * Jest — app (react-native-web) project.
 *
 * Real component/screen rendering through `jest-expo/web`, which maps
 * `react-native` to `react-native-web` and runs in jsdom. Native modules are
 * replaced by honest doubles in `tests/app/setup.ts`.
 *
 * The mapper order matters: `@/assets/*` must be resolved before the general
 * `@/*` alias, otherwise `.wav`/`.png` imports are looked up under `src/`.
 */
const preset = require('jest-expo/web/jest-preset');

const { watchPlugins: _watchPlugins, moduleNameMapper: presetMapper, ...presetConfig } = preset;

const { '^@/(.*)$': _alias, '^@/assets/(.*)$': _assets, ...restMapper } = presetMapper;

module.exports = {
  ...presetConfig,
  displayName: 'app-web',
  rootDir: __dirname,
  roots: ['<rootDir>/tests/app'],
  testMatch: ['**/*.test.tsx'],
  setupFilesAfterEnv: [...(presetConfig.setupFilesAfterEnv ?? []), '<rootDir>/tests/app/setup.ts'],
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    ...restMapper,
  },
  testEnvironmentOptions: { url: 'http://localhost/' },
};
