'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STEPS } from './schema';

interface ProgressStepsProps {
  /** Índice del paso actual (0-based). */
  current: number;
}

/** Indicador de progreso del wizard: puntos numerados + barra de avance. */
export function ProgressSteps({ current }: ProgressStepsProps): React.JSX.Element {
  const pct = STEPS.length > 1 ? (current / (STEPS.length - 1)) * 100 : 0;

  return (
    <nav aria-label="Progreso de la reserva" className="w-full">
      <ol className="relative flex items-center justify-between">
        {/* Rieles */}
        <div
          className="absolute left-0 right-0 top-4 h-0.5 -translate-y-1/2 rounded-full bg-gold/25"
          aria-hidden="true"
        />
        <motion.div
          className="absolute left-0 top-4 h-0.5 -translate-y-1/2 rounded-full bg-brand-gradient"
          aria-hidden="true"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        />

        {STEPS.map((step, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li
              key={step.id}
              className="relative z-10 flex flex-col items-center gap-2"
              aria-current={active ? 'step' : undefined}
            >
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                  done && 'border-transparent bg-brand-gradient text-white shadow-glow',
                  active && 'border-brand-500 bg-surface text-brand-600 shadow-soft',
                  !done && !active && 'border-gold/40 bg-surface text-ink-soft/60',
                )}
              >
                {done ? <Check className="size-4" aria-hidden="true" /> : index + 1}
              </span>
              <span
                className={cn(
                  'hidden text-xs font-medium sm:block',
                  active ? 'text-brand-700' : 'text-ink-soft/60',
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
