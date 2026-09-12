import { AppText } from '@/components/ui/AppText';
import { renderScreen, visibleText } from './helpers';

it('renders themed Arabic text', async () => {
  const { container } = await renderScreen(<AppText variant="scripture">بسم الله</AppText>);
  expect(visibleText(container)).toContain('بسم الله');
});
