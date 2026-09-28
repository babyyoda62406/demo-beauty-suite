'use client';

import * as React from 'react';
import {
  BarChart3,
  CalendarDays,
  Gift,
  Images,
  MessageSquareQuote,
  Package,
  Scissors,
  Settings,
  ShoppingBag,
  Stamp,
  Ticket,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DashboardShell } from './shell';
import type { ShellConfig } from './nav';

/** Salon admin shell (SPEC §9 — panel salón). */
export function AdminShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  const t = useTranslations('admin');

  const config: ShellConfig = {
    title: t('title'),
    badge: 'Salón',
    items: [
      { label: t('nav.agenda'), href: '/salon', icon: CalendarDays },
      { label: t('nav.clients'), href: '/salon/clientas', icon: Users },
      { label: 'Fidelización', href: '/salon/fidelizacion', icon: Stamp },
      { label: 'Tarjetas regalo', href: '/salon/tarjetas', icon: Gift },
      { label: 'Bonos', href: '/salon/bonos', icon: Ticket },
      { label: t('nav.cash'), href: '/salon/caja', icon: Wallet },
      { label: t('nav.inventory'), href: '/salon/inventario', icon: Package },
      { label: t('nav.employees'), href: '/salon/empleadas', icon: Users },
      { label: t('nav.store'), href: '/salon/tienda', icon: ShoppingBag },
      { label: t('nav.stats'), href: '/salon/estadisticas', icon: BarChart3 },
      { label: t('nav.settings'), href: '/salon/ajustes', icon: Settings },
      { label: 'Mi perfil', href: '/salon/perfil', icon: UserCircle },
      { label: t('nav.webServices'), href: '/salon/servicios', icon: Scissors, section: t('nav.web') },
      { label: t('nav.webGallery'), href: '/salon/galeria', icon: Images, section: t('nav.web') },
      { label: t('nav.webReviews'), href: '/salon/opiniones', icon: MessageSquareQuote, section: t('nav.web') },
    ],
  };

  return <DashboardShell config={config}>{children}</DashboardShell>;
}
