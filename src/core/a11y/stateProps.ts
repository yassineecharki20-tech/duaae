import { Platform } from 'react-native';

/**
 * State props for interactive elements.
 *
 * Why this exists: react-native-web 0.21 forwards `accessibilityRole` but does
 * **not** translate `accessibilityState` into ARIA attributes, so `selected` /
 * `disabled` / `checked` are invisible to screen readers on the web (verified:
 * a `role="tab"` Pressable renders without `aria-selected`). Native platforms
 * read `accessibilityState` correctly.
 *
 * `a11yState` therefore returns the React Native prop plus the explicit ARIA
 * attributes on web only. Every interactive component in the app funnels its
 * state through here, so the two platforms stay in sync from one call site.
 */

export interface A11yState {
  selected?: boolean;
  disabled?: boolean;
  checked?: boolean;
  expanded?: boolean;
  busy?: boolean;
}

export type A11yStateProps = {
  accessibilityState: A11yState;
  'aria-selected'?: boolean;
  'aria-disabled'?: boolean;
  'aria-checked'?: boolean;
  'aria-expanded'?: boolean;
  'aria-busy'?: boolean;
};

export function a11yState(state: A11yState): A11yStateProps {
  if (Platform.OS !== 'web') {
    return { accessibilityState: state };
  }

  return {
    accessibilityState: state,
    'aria-selected': state.selected,
    'aria-disabled': state.disabled,
    'aria-checked': state.checked,
    'aria-expanded': state.expanded,
    'aria-busy': state.busy,
  };
}

/**
 * Label + hint bundle. Keeps the (required) accessible name next to the state
 * so call sites cannot forget one of them.
 */
export function a11yLabel(label: string, hint?: string) {
  return { accessibilityLabel: label, ...(hint ? { accessibilityHint: hint } : null) };
}
