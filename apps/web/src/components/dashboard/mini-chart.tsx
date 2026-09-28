'use client';

import * as React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const placeholderData = [
  { label: 'Lun', value: 12 },
  { label: 'Mar', value: 18 },
  { label: 'Mié', value: 15 },
  { label: 'Jue', value: 24 },
  { label: 'Vie', value: 32 },
  { label: 'Sáb', value: 40 },
  { label: 'Dom', value: 22 },
];

/**
 * Placeholder weekly area chart for the dashboard skeleton. The stats module
 * will feed it real aggregates in the fan-out phase.
 */
export function MiniChart(): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={placeholderData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="brandArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D6157F" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#D6157F" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#FBCFE3" vertical={false} />
        <XAxis dataKey="label" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: '1px solid #FBCFE3',
            boxShadow: '0 8px 30px -12px rgba(20,20,20,0.15)',
          }}
          labelStyle={{ color: '#141414', fontWeight: 600 }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#D6157F"
          strokeWidth={2.5}
          fill="url(#brandArea)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
