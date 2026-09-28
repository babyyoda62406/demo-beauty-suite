'use client';

import * as React from 'react';
import { Blocks, Building2, CreditCard, Gauge, LifeBuoy, Layers } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DashboardShell } from './shell';
import type { ShellConfig } from './nav';

/** Platform super-admin shell (SPEC §9 — Super Admin). */
export function SuperadminShell({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const t = useTranslations('superadmin');

  const config: ShellConfig = {
    title: t('title'),
    badge: 'Plataforma',
    items: [
      { label: t('nav.tenants'), href: '/plataforma', icon: Building2 },
      { label: t('nav.plans'), href: '/plataforma/planes', icon: Layers },
      { label: t('nav.subscriptions'), href: '/plataforma/suscripciones', icon: CreditCard },
      { label: t('nav.incidents'), href: '/plataforma/incidencias', icon: LifeBuoy },
      { label: t('nav.modules'), href: '/plataforma/modulos', icon: Blocks },
      { label: t('nav.stats'), href: '/plataforma/estadisticas', icon: Gauge },
    ],
  };

  return <DashboardShell config={config}>{children}</DashboardShell>;
}
