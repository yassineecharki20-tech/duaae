import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { AppError } from '@/core/errors/AppError';
import { logger } from '@/core/utils/logger';
import { services } from '@/services/registry';
import { useAppTheme } from '@/design/theme/ThemeProvider';
import { useI18n } from '@/core/i18n/I18nProvider';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

const log = logger.child('error-boundary');

function CrashScreen({ error, onReset }: { error: Error; onReset: () => void }) {
  const theme = useAppTheme();
  const { t } = useI18n();
  const message = AppError.from(error).userMessage;

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 }}
      style={{ backgroundColor: theme.colors.background }}
    >
      <View style={{ gap: 12, alignItems: 'center' }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: theme.colors.errorContainer,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="alert-circle-outline" size={32} color={theme.colors.error} />
        </View>
        <AppText variant="heading" align="center">
          {t('error.genericTitle')}
        </AppText>
        <AppText align="center" tone="muted">
          {message}
        </AppText>
        <AppText align="center" tone="subtle" style={{ fontSize: 12 }}>
          {error.message}
        </AppText>
        <Button label={t('common.retry')} onPress={onReset} icon="refresh-outline" />
      </View>
    </ScrollView>
  );
}

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last line of defence: a render crash anywhere still lands the user on a
 * designed, recoverable surface instead of a blank screen.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    log.error('render crash captured', { message: error.message, stack: info.componentStack });
    void services.analytics().logError(error, true);
  }

  private reset = () => this.setState({ error: null });

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return <CrashScreen error={this.state.error} onReset={this.reset} />;
  }
}
