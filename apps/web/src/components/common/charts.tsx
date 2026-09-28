'use client';

import * as React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { ChartCard, type ChartCardProps } from './ChartCard';

/**
 * Paleta categórica de marca para series de gráficas (magenta + acentos).
 * Ordenada por contraste para lecturas de varias series.
 */
export const CHART_COLORS = [
  '#D6157F', // brand-500
  '#E84393', // brand-400
  '#9D0E4B', // brand-700
  '#F075AE', // brand-300
  '#C2185B', // brand-600
  '#7A0B3A', // brand-800
] as const;

/** Formateador de valores del eje/tooltip. */
export type ValueFormatter = (value: number) => string;

const defaultFormatter: ValueFormatter = (value) =>
  new Intl.NumberFormat('es-ES').format(value);

/** Color de la serie `i`, con override opcional y fallback seguro. */
function colorAt(index: number, override?: string): string {
  return override ?? CHART_COLORS[index % CHART_COLORS.length] ?? CHART_COLORS[0];
}

const AXIS_PROPS = {
  stroke: '#9ca3af',
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const;

/** Tooltip de marca en es-ES, compartido por todas las gráficas. */
function BrandTooltip({
  active,
  payload,
  label,
  formatter,
}: TooltipProps<number, string> & { formatter: ValueFormatter }): React.JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-brand-100 bg-white/95 px-3 py-2 text-xs shadow-card backdrop-blur">
      {label !== undefined && label !== '' ? (
        <p className="mb-1 font-medium text-ink">{String(label)}</p>
      ) : null}
      <ul className="space-y-0.5">
        {payload.map((entry, i) => (
          <li key={`${entry.name}-${i}`} className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: entry.color ?? CHART_COLORS[0] }}
              aria-hidden="true"
            />
            <span className="text-ink-soft/80">{entry.name}</span>
            <span className="ml-auto font-medium tabular-nums text-ink">
              {formatter(Number(entry.value ?? 0))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Una serie de datos: clave en el objeto + etiqueta legible + color opcional. */
export interface ChartSeries {
  dataKey: string;
  name: string;
  color?: string;
}

interface BaseChartProps<T> extends Omit<ChartCardProps, 'children'> {
  data: T[];
  /** Clave del eje categórico (X). */
  categoryKey: string;
  series: ChartSeries[];
  valueFormatter?: ValueFormatter;
}

// -----------------------------------------------------------------------------
// Línea (área con gradiente)
// -----------------------------------------------------------------------------

export function LineChartCard<T extends Record<string, unknown>>({
  data,
  categoryKey,
  series,
  valueFormatter = defaultFormatter,
  ...cardProps
}: BaseChartProps<T>): React.JSX.Element {
  const empty = cardProps.empty ?? data.length === 0;
  return (
    <ChartCard {...cardProps} empty={empty}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {series.map((s, i) => {
              const color = colorAt(i, s.color);
              return (
                <linearGradient key={s.dataKey} id={`grad-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3d3e4" vertical={false} />
          <XAxis dataKey={categoryKey} {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} tickFormatter={valueFormatter} width={56} />
          <Tooltip content={<BrandTooltip formatter={valueFormatter} />} cursor={{ stroke: '#F7A9CC' }} />
          {series.length > 1 ? <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /> : null}
          {series.map((s, i) => {
            const color = colorAt(i, s.color);
            return (
              <Area
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                stroke={color}
                strokeWidth={2.5}
                fill={`url(#grad-${s.dataKey})`}
                activeDot={{ r: 4 }}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// -----------------------------------------------------------------------------
// Barras
// -----------------------------------------------------------------------------

export interface BarChartCardProps<T> extends BaseChartProps<T> {
  /** Apila las series en vez de agruparlas. */
  stacked?: boolean;
}

export function BarChartCard<T extends Record<string, unknown>>({
  data,
  categoryKey,
  series,
  valueFormatter = defaultFormatter,
  stacked = false,
  ...cardProps
}: BarChartCardProps<T>): React.JSX.Element {
  const empty = cardProps.empty ?? data.length === 0;
  return (
    <ChartCard {...cardProps} empty={empty}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3d3e4" vertical={false} />
          <XAxis dataKey={categoryKey} {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} tickFormatter={valueFormatter} width={56} />
          <Tooltip
            content={<BrandTooltip formatter={valueFormatter} />}
            cursor={{ fill: '#FCE7F1', opacity: 0.5 }}
          />
          {series.length > 1 ? <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /> : null}
          {series.map((s, i) => (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.name}
              fill={colorAt(i, s.color)}
              radius={stacked ? 0 : [6, 6, 0, 0]}
              maxBarSize={48}
              {...(stacked ? { stackId: 'stack' } : {})}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// -----------------------------------------------------------------------------
// Donut
// -----------------------------------------------------------------------------

export interface DonutDatum {
  name: string;
  value: number;
  color?: string;
}

export interface DonutChartCardProps extends Omit<ChartCardProps, 'children'> {
  data: DonutDatum[];
  valueFormatter?: ValueFormatter;
}

export function DonutChartCard({
  data,
  valueFormatter = defaultFormatter,
  ...cardProps
}: DonutChartCardProps): React.JSX.Element {
  const empty = cardProps.empty ?? data.length === 0;
  return (
    <ChartCard {...cardProps} empty={empty}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={colorAt(i, entry.color)} />
            ))}
          </Pie>
          <Tooltip content={<BrandTooltip formatter={valueFormatter} />} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
