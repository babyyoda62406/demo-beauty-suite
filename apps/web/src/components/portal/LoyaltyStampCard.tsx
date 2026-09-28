'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Check, Gift, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STAMPS_PER_REWARD, type LoyaltyCard } from '@/lib/hooks/portal';

export interface LoyaltyStampCardProps {
  card: Pick<LoyaltyCard, 'stamps' | 'freeEarned'>;
  /** Compacta la tarjeta para el resumen del dashboard. */
  compact?: boolean;
  className?: string;
}

/**
 * Tarjeta visual de fidelización 10 → 1 (SPEC — fidelización núcleo).
 * Diez casillas de sello: las llenas muestran una marca de marca; la décima es
 * el regalo. Cuando hay recompensas disponibles (`freeEarned`), la tarjeta lo
 * celebra. Estética premium: gradiente magenta, brillo suave y micro-animación.
 */
export function LoyaltyStampCard({
  card,
  compact = false,
  className,
}: LoyaltyStampCardProps): React.JSX.Element {
  const stamps = Math.max(0, Math.min(card.stamps, STAMPS_PER_REWARD));
  const remaining = STAMPS_PER_REWARD - stamps;
  const hasReward = card.freeEarned > 0;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl bg-brand-gradient p-6 text-white shadow-glow sm:p-8',
        className,
      )}
    >
      {/* Decoración */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-white/10 blur-2xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-10 size-48 rounded-full bg-white/10 blur-2xl"
        aria-hidden="true"
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-2xl leading-none text-white/95">Tarjeta de sellos</p>
            <p className="mt-2 text-sm text-white/80">
              Reúne {STAMPS_PER_REWARD} sellos y tu siguiente servicio es nuestro regalo.
            </p>
          </div>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
        </div>

        {/* Rejilla de sellos */}
        <ul
          className={cn(
            'mt-6 grid grid-cols-5 gap-2.5 sm:gap-3',
            compact && 'gap-2',
          )}
          aria-label={`${stamps} de ${STAMPS_PER_REWARD} sellos`}
        >
          {Array.from({ length: STAMPS_PER_REWARD }).map((_, i) => {
            const filled = i < stamps;
            const isReward = i === STAMPS_PER_REWARD - 1;
            return (
              <li key={i} className="flex items-center justify-center">
                <motion.span
                  initial={false}
                  animate={filled ? { scale: [0.6, 1.12, 1] } : { scale: 1 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className={cn(
                    'flex aspect-square w-full items-center justify-center rounded-full border text-white',
                    compact ? 'max-w-9' : 'max-w-12',
                    filled
                      ? 'border-white/70 bg-white/25 shadow-sm backdrop-blur-sm'
                      : 'border-dashed border-white/40 bg-white/5',
                  )}
                >
                  {isReward ? (
                    <Gift
                      className={cn(compact ? 'size-4' : 'size-5', filled ? 'text-white' : 'text-white/70')}
                      aria-hidden="true"
                    />
                  ) : filled ? (
                    <Check className={compact ? 'size-4' : 'size-5'} aria-hidden="true" />
                  ) : (
                    <span className="text-xs font-semibold text-white/50">{i + 1}</span>
                  )}
                </motion.span>
              </li>
            );
          })}
        </ul>

        {/* Estado */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/20 pt-4">
          <p className="text-sm text-white/85">
            {hasReward ? (
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <Gift className="size-4" aria-hidden="true" />
                {card.freeEarned === 1
                  ? 'Tienes 1 regalo disponible'
                  : `Tienes ${card.freeEarned} regalos disponibles`}
              </span>
            ) : remaining === 0 ? (
              '¡Tarjeta completa!'
            ) : (
              <>
                Te {remaining === 1 ? 'falta' : 'faltan'}{' '}
                <span className="font-semibold text-white">{remaining}</span>{' '}
                {remaining === 1 ? 'sello' : 'sellos'} para tu regalo
              </>
            )}
          </p>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            {stamps}/{STAMPS_PER_REWARD}
          </span>
        </div>
      </div>
    </div>
  );
}
