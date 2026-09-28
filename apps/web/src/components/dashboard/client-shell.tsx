'use client';

import * as React from 'react';
import {
  Bell,
  CalendarDays,
  CreditCard,
  Gift,
  Heart,
  Image as ImageIcon,
  LayoutDashboard,
  User,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DashboardShell } from './shell';
import type { ShellConfig } from './nav';

/** Client portal shell (SPEC §9 — portal clienta). */
export function ClientShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  const t = useTranslations('client');

  const config: ShellConfig = {
    title: t('title'),
    badge: 'Clienta',
    items: [
      { label: t('nav.dashboard'), href: '/portal', icon: LayoutDashboard },
      { label: t('nav.appointments'), href: '/portal/citas', icon: CalendarDays },
      { label: t('nav.loyalty'), href: '/portal/fidelizacion', icon: Heart },
      { label: t('nav.payments'), href: '/portal/pagos', icon: CreditCard },
      { label: t('nav.photos'), href: '/portal/fotos', icon: ImageIcon },
      { label: t('nav.vouchers'), href: '/portal/bonos', icon: Gift },
      { label: t('nav.notifications'), href: '/portal/notificaciones', icon: Bell },
      { label: t('nav.profile'), href: '/portal/perfil', icon: User },
    ],
  };

  return <DashboardShell config={config}>{children}</DashboardShell>;
}
