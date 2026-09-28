import * as React from 'react';
import Link from 'next/link';
import { CalendarHeart, Gift, Heart, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

const ACTIONS: QuickAction[] = [
  {
    label: 'Reservar cita',
    description: 'Elige servicio, profesional y hora',
    href: '/reservar',
    icon: CalendarHeart,
  },
  {
    label: 'Mis citas',
    description: 'Consulta, reprograma o cancela',
    href: '/portal/citas',
    icon: CalendarHeart,
  },
  {
    label: 'Fidelización',
    description: 'Tus sellos y regalos',
    href: '/portal/fidelizacion',
    icon: Heart,
  },
  {
    label: 'Bonos y regalos',
    description: 'Saldo de bonos y tarjetas',
    href: '/portal/bonos',
    icon: Gift,
  },
];

/** Rejilla de accesos rápidos del portal (dashboard). */
export function QuickActions({ className }: { className?: string }): React.JSX.Element {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-4', className)}>
      {ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href + action.label}
            href={action.href}
            className="group flex items-center gap-3 rounded-2xl border border-brand-100 bg-white/80 p-4 shadow-card backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-soft transition-transform group-hover:scale-105">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium text-ink">{action.label}</span>
              <span className="block truncate text-xs text-ink-soft/70">{action.description}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
