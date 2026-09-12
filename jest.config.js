/**
 * Test entry point — two projects:
 *   logic   pure TypeScript (content corpus, search, dates, Arabic utils, errors)
 *   app-web real component/screen rendering through react-native-web + jsdom
 *
 * `jest-expo` is installed with `--legacy-peer-deps` because its optional
 * `react-server-dom-webpack` peer wants React ^19.2.4 while Expo SDK 57 pins
 * 19.2.3; the runtime itself works fine (verified by this suite).
 */
module.exports = {
  projects: ['<rootDir>/jest.logic.config.js', '<rootDir>/jest.app.config.js'],
};
