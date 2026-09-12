/**
 * Ambient declarations for non-TS assets imported from source.
 *
 * Metro bundles these by extension; TypeScript needs a module declaration so
 * `import tick from '@/assets/audio/tick.wav'` type-checks. Image types are
 * already covered by `expo-env.d.ts`.
 */

declare module '*.wav' {
  const source: number;
  export default source;
}

declare module '*.mp3' {
  const source: number;
  export default source;
}

declare module '*.svg' {
  import type React from 'react';
  import type { SvgProps } from 'react-native-svg';

  const content: React.FC<SvgProps>;
  export default content;
}
