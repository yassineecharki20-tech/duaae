import { createContext, useCallback, useContext, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Animated, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { AppText } from './AppText';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  text: string;
}

interface ToastContextValue {
  show(text: string, kind?: ToastKind): void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => undefined });

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

const DURATION = 2600;

/**
 * Minimal toast host. One message at a time, queued by replacement — a dua app
 * does not need a notification stack, and one line keeps the UI calm.
 */
export function ToastProvider({ children }: PropsWithChildren) {
  const theme = useAppTheme();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const [translate] = useState(() => new Animated.Value(16));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (text: string, kind: ToastKind = 'info') => {
      if (timer.current) clearTimeout(timer.current);

      setToast({ id: Date.now(), kind, text });

      const animate = () => {
        if (theme.reduceMotion) {
          opacity.setValue(1);
          translate.setValue(0);
          return;
        }
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: theme.motion.duration.base,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.spring(translate, { toValue: 0, useNativeDriver: Platform.OS !== 'web', friction: 9 }),
        ]).start();
      };
      animate();

      timer.current = setTimeout(() => {
        if (theme.reduceMotion) {
          opacity.setValue(0);
          setToast(null);
          return;
        }
        Animated.timing(opacity, {
          toValue: 0,
          duration: theme.motion.duration.fast,
          useNativeDriver: Platform.OS !== 'web',
        }).start(() => setToast(null));
      }, DURATION);
    },
    [opacity, translate, theme],
  );

  const value = useMemo(() => ({ show }), [show]);

  const icon =
    toast?.kind === 'success' ? 'checkmark-circle' : toast?.kind === 'error' ? 'alert-circle' : 'information-circle';
  const iconColor =
    toast?.kind === 'success'
      ? theme.colors.success
      : toast?.kind === 'error'
        ? theme.colors.error
        : theme.colors.accent;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: theme.layout.tabBarHeight + theme.spacing.xl,
            alignItems: 'center',
            opacity,
            transform: [{ translateY: translate }],
            paddingHorizontal: theme.spacing.lg,
            zIndex: theme.zIndex.toast,
          }}
          accessibilityLiveRegion="polite"
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
              backgroundColor: theme.colors.surfaceOverlay,
              borderRadius: theme.radii.pill,
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.md,
              maxWidth: theme.layout.maxContentWidth,
              ...(theme.shadows.md as object),
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Ionicons name={icon} size={18} color={iconColor} />
            <AppText weight="medium" style={{ color: theme.colors.text, fontSize: 14 }}>
              {toast.text}
            </AppText>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}
