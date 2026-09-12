/**
 * Accessibility regressions.
 *
 * These pin the attributes assistive technology actually reads on the web:
 * ARIA state on interactive elements, RTL writing direction on text, accessible
 * names on icon-only controls, and a minimum touch target.
 */

import { fireEvent } from '@testing-library/react';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { AppText } from '@/components/ui/AppText';
import { Segmented } from '@/components/ui/Controls';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { ProgressBar } from '@/components/ui/Progress';
import { renderScreen } from './helpers';

describe('ARIA state', () => {
  it('exposes disabled on buttons', async () => {
    const { getByLabelText } = await renderScreen(
      <Button label="حفظ" accessibilityLabel="حفظ" disabled onPress={() => undefined} />,
    );
    const element = getByLabelText('حفظ');
    expect(element.getAttribute('aria-disabled')).toBe('true');
  });

  it('exposes busy while loading', async () => {
    const { getByLabelText } = await renderScreen(
      <Button label="حفظ" accessibilityLabel="حفظ" loading onPress={() => undefined} />,
    );
    expect(getByLabelText('حفظ').getAttribute('aria-busy')).toBe('true');
  });

  it('exposes selection on chips and segmented options', async () => {
    const { getByLabelText } = await renderScreen(
      <>
        <Chip label="الصباح" selected onPress={() => undefined} />
        <Segmented
          options={[
            { value: 'light', label: 'نهاري' },
            { value: 'dark', label: 'ليلي' },
          ]}
          value="dark"
          onChange={() => undefined}
          accessibilityLabel="السمة"
        />
      </>,
    );

    expect(getByLabelText('الصباح').getAttribute('aria-selected')).toBe('true');
    expect(getByLabelText('ليلي').getAttribute('aria-selected')).toBe('true');
    expect(getByLabelText('نهاري').getAttribute('aria-selected')).toBe('false');
  });

  it('exposes the switch value on settings toggles', async () => {
    const { container } = await renderScreen(
      <SettingsRow icon="volume-high-outline" title="الأصوات" switchValue onSwitchChange={() => undefined} />,
    );
    const toggle = container.querySelector('[role="switch"]');
    expect(toggle).toBeTruthy();
    expect(toggle?.getAttribute('aria-checked')).toBe('true');
  });

  it('labels progress for screen readers', async () => {
    const { container } = await renderScreen(
      <ProgressBar value={0.5} accessibilityLabel="تقدّم الجلسة" />,
    );
    const bar = container.querySelector('[aria-label="تقدّم الجلسة"]');
    expect(bar).toBeTruthy();
  });
});

describe('chip affordances', () => {
  it('names a chip that carries no gesture', async () => {
    const { getByLabelText } = await renderScreen(<Chip label="الفرج" />);
    expect(getByLabelText('الفرج')).toBeTruthy();
  });

  it('renders a long-press-only chip as a button', async () => {
    const { getByLabelText } = await renderScreen(<Chip label="الفرج" onLongPress={() => undefined} />);
    expect(getByLabelText('الفرج').getAttribute('role')).toBe('button');
  });

  it('names the inline remove control, and keeps it separate from the chip', async () => {
    const onChip = jest.fn();
    const onRemove = jest.fn();
    const { getByLabelText } = await renderScreen(
      <Chip
        label="الفرج"
        onPress={onChip}
        trailingAction={{
          icon: 'close',
          accessibilityLabel: 'إزالة الفرج من السجل',
          onPress: onRemove,
        }}
      />,
    );

    fireEvent.click(getByLabelText('إزالة الفرج من السجل'));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onChip).not.toHaveBeenCalled();
  });
});

describe('RTL text', () => {
  it('renders every text node with an explicit RTL direction', async () => {
    const { container } = await renderScreen(
      <>
        <AppText variant="body">دعاء</AppText>
        <AppText variant="scripture">رَبِّ زِدْنِي عِلْمًا</AppText>
      </>,
    );
    const nodes = [...container.querySelectorAll<HTMLElement>('*')].filter(
      (node) => (node.textContent ?? '').trim().length > 0 && node.children.length === 0,
    );
    expect(nodes.length).toBe(2);
    for (const node of nodes) {
      expect(node.getAttribute('dir') ?? node.style.getPropertyValue('direction')).toBeTruthy();
    }
  });
});

describe('touch targets and names', () => {
  it('keeps icon buttons at or above 44px with a required label', async () => {
    const { getByLabelText } = await renderScreen(
      <IconButton icon="heart-outline" accessibilityLabel="إضافة إلى المفضلة" onPress={() => undefined} />,
    );
    const element = getByLabelText('إضافة إلى المفضلة');
    const width = Number.parseFloat(element.style.width);
    const height = Number.parseFloat(element.style.height);
    expect(width).toBeGreaterThanOrEqual(44);
    expect(height).toBeGreaterThanOrEqual(44);
  });
});
