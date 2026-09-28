'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, LogOut, Menu, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetTrigger,
  toast,
} from '@fgd/ui';
import { api, ApiClientError } from '@/lib/api';
import { useCurrentUser } from '@/lib/hooks/use-api';
import { mediaUrl } from '@/lib/media';
import { cn } from '@/lib/utils';
import type { ShellConfig } from './nav';

function NavList({
  items,
  pathname,
  onNavigate,
}: {
  items: ShellConfig['items'];
  pathname: string;
  onNavigate?: () => void;
}): React.JSX.Element {
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {items.map((item, index) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        const showSection = item.section && item.section !== items[index - 1]?.section;
        return (
          <React.Fragment key={item.href}>
            {showSection ? (
              <p className="mt-4 px-3 pb-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ink-soft/50 first:mt-0">
                {item.section}
              </p>
            ) : null}
            <Link
              href={item.href}
              {...(onNavigate ? { onClick: onNavigate } : {})}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-gradient text-white shadow-soft'
                  : 'text-ink-soft hover:bg-brand-50 hover:text-brand-700',
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

function SidebarBody({
  config,
  pathname,
  onNavigate,
}: {
  config: ShellConfig;
  pathname: string;
  onNavigate?: () => void;
}): React.JSX.Element {
  return (
    <div className="flex h-full flex-col gap-6">
      <Link href="/" className="flex items-center gap-3" {...(onNavigate ? { onClick: onNavigate } : {})}>
        <span className="relative size-10 overflow-hidden rounded-full ring-2 ring-brand-200">
          <Image src="/brand/logo.jpeg" alt="Estudio Aurora" fill sizes="40px" className="object-cover" />
        </span>
        <span className="flex flex-col leading-none">
          <span className="font-display text-xl text-brand-600">Estudio Aurora</span>
          <span className="text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft/60">
            {config.title}
          </span>
        </span>
      </Link>
      <Badge variant="outline" className="w-fit">
        {config.badge}
      </Badge>
      <NavList items={config.items} pathname={pathname} {...(onNavigate ? { onNavigate } : {})} />
    </div>
  );
}

/**
 * Shared dashboard shell for the client / admin / superadmin areas.
 * Fixed sidebar on desktop, off-canvas Sheet on mobile, sticky topbar with
 * search, notifications and logout. Nav is data-driven via `config`.
 */
export function DashboardShell({
  config,
  children,
}: {
  config: ShellConfig;
  children: React.ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const tc = useTranslations('common');
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Iniciales de quien ha iniciado sesión. Antes estaban fijas ("DC"), así que
  // una alumna o una clienta veían las de la dueña del salón como si fueran suyas.
  const { data: currentUser } = useCurrentUser();
  const initials = React.useMemo(() => {
    const partes = (currentUser?.name ?? '').trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '·';
    const primera = partes[0]?.[0] ?? '';
    const segunda = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '';
    return (primera + segunda).toUpperCase();
  }, [currentUser?.name]);

  const onLogout = React.useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      if (!(error instanceof ApiClientError)) {
        toast({ title: 'No se pudo cerrar sesión', variant: 'danger' });
      }
    } finally {
      router.push('/login');
      router.refresh();
    }
  }, [router]);

  return (
    <div className="min-h-dvh bg-surface-subtle">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-brand-100/70 bg-white/80 px-5 py-6 backdrop-blur-sm lg:block">
        <SidebarBody config={config} pathname={pathname} />
      </aside>

      <div className="lg:pl-72">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-brand-100/70 bg-white/80 px-4 backdrop-blur-md sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SidebarBody
                config={config}
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <div className="relative hidden max-w-sm flex-1 sm:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft/50" />
            <Input placeholder={tc('search')} className="h-10 pl-9" />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Notificaciones" className="relative">
              <Bell />
              <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-brand-500" />
            </Button>
            <Avatar>
              {currentUser?.photoUrl ? (
                <AvatarImage src={mediaUrl(currentUser.photoUrl)} alt={currentUser.name} />
              ) : null}
              <AvatarFallback title={currentUser?.name ?? ''}>{initials}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" aria-label={tc('logout')} onClick={onLogout}>
              <LogOut />
            </Button>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
