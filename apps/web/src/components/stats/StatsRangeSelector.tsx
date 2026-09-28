'use client';

import * as React from 'react';
import { DATE_RANGE_PRESET_LABELS, type DateRangePreset } from '@/lib/format';
import { SegmentedControl } from './SegmentedControl';

/** Preajustes ofrecidos en el panel de estadísticas (orden de aparición). */
const PRESETS: DateRangePreset[] = ['last7', 'last30', 'thisMonth', 'lastMonth', 'thisYear'];

export interface StatsRangeSelectorProps {
  value: DateRangePreset;
  onChange: (preset: DateRangePreset) => void;
  className?: string;
}

/** Selector de rango de fechas del panel de estadísticas. */
export function StatsRangeSelector({
  value,
  onChange,
  className,
}: StatsRangeSelectorProps): React.JSX.Element {
  return (
    <SegmentedControl
      ariaLabel="Rango de fechas"
      value={value}
      onChange={onChange}
      className={className}
      options={PRESETS.map((preset) => ({
        value: preset,
        label: DATE_RANGE_PRESET_LABELS[preset],
      }))}
    />
  );
}
