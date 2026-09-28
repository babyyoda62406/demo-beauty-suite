'use client';

import * as React from 'react';
import {
  BookOpen,
  Boxes,
  CalendarDays,
  Gift,
  Loader2,
  Megaphone,
  ShoppingBag,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Badge, Card, Skeleton, useToast } from '@/components/ui';
import { EmptyState, ErrorState, getErrorMessage } from '@/components/common';
import {
  useSetTenantModule,
  useTenantModules,
  useTenants,
  type ModuleActivation,
} from '@/lib/hooks/superadmin';

/** Catálogo de módulos de negocio con etiqueta e icono (claves en kebab-case). */
const MODULE_CATALOG: { key: string; label: string; description: string; icon: LucideIcon }[] = [
  { key: 'bookings', label: 'Agenda y reservas', description: 'Citas, disponibilidad y calendario.', icon: CalendarDays },
  { key: 'clients', label: 'Clientas (CRM)', description: 'Fichas, historial y fidelización.', icon: Users },
  { key: 'cash', label: 'Caja y pagos', description: 'Cobros, arqueos y gastos.', icon: Wallet },
  { key: 'inventory', label: 'Inventario', description: 'Productos, stock y proveedores.', icon: Boxes },
  { key: 'store', label: 'Tienda online', description: 'Venta de productos y pedidos.', icon: ShoppingBag },
  { key: 'marketing', label: 'Marketing', description: 'Campañas, cupones y promociones.', icon: Megaphone },
  { key: 'loyalty', label: 'Fidelización', description: 'Puntos, bonos y tarjetas regalo.', icon: Gift },
  { key: 'blog', label: 'Blog y contenido', description: 'Artículos y galería pública.', icon: BookOpen },
];

/** Activación de módulos de negocio por salón (SUPERADMIN, SPEC §6/§7). */
export function ModulesManager(): React.JSX.Element {
  const { toast } = useToast();
  const [tenantId, setTenantId] = React.useState<string>('');

  const tenantsQuery = useTenants({ page: 1, pageSize: 100, sortBy: 'name', sortOrder: 'asc' });
  const tenants = tenantsQuery.data?.data ?? [];

  // Selecciona el primer salón automáticamente al cargar.
  React.useEffect(() => {
    if (!tenantId && tenants.length > 0) setTenantId(tenants[0]!.id);
  }, [tenantId, tenants]);

  const modulesQuery = useTenantModules(tenantId || undefined);
  const setModule = useSetTenantModule();

  const stateByKey = React.useMemo(() => {
    const map = new Map<string, ModuleActivation>();
    for (const m of modulesQuery.data ?? []) map.set(m.moduleKey, m);
    return map;
  }, [modulesQuery.data]);

  const [pending, setPending] = React.useState<string | null>(null);

  const handleToggle = async (moduleKey: string, next: boolean): Promise<void> => {
    if (!tenantId) return;
    setPending(moduleKey);
    try {
      await setModule.mutateAsync({ tenantId, moduleKey, enabled: next });
      toast({
        variant: 'success',
        title: next ? 'Módulo activado' : 'Módulo desactivado',
        description: MODULE_CATALOG.find((m) => m.key === moduleKey)?.label ?? moduleKey,
      });
    } catch (error) {
      toast({ variant: 'danger', title: 'No se pudo actualizar', description: getErrorMessage(error) });
    } finally {
      setPending(null);
    }
  };

  if (tenantsQuery.isError) {
    return <ErrorState error={tenantsQuery.error} onRetry={() => void tenantsQuery.refetch()} />;
  }

  if (!tenantsQuery.isLoading && tenants.length === 0) {
    return (
      <EmptyState
        icon={Boxes}
        title="Sin salones"
        description="Da de alta un salón para poder activar sus módulos."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label htmlFor="module-tenant" className="text-sm font-medium text-ink">
            Salón
          </label>
          <p className="text-xs text-ink-soft/70">Elige el salón cuyos módulos quieres gestionar.</p>
        </div>
        <select
          id="module-tenant"
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          disabled={tenantsQuery.isLoading}
          className="h-11 w-full rounded-xl border border-brand-100 bg-white px-4 pr-9 text-sm text-ink shadow-sm transition-colors focus-visible:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 sm:w-72"
        >
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Card>

      {modulesQuery.isError ? (
        <ErrorState error={modulesQuery.error} onRetry={() => void modulesQuery.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {MODULE_CATALOG.map((mod) => {
            const activation = stateByKey.get(mod.key);
            const enabled = activation ? activation.enabled : false;
            const loading = modulesQuery.isLoading && !modulesQuery.data;
            const busy = pending === mod.key;
            const Icon = mod.icon;
            return (
              <Card key={mod.key} className="flex items-start gap-4 p-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{mod.label}</p>
                    {loading ? null : enabled ? (
                      <Badge variant="success">Activo</Badge>
                    ) : (
                      <Badge variant="neutral">Inactivo</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-soft/70">{mod.description}</p>
                </div>
                {loading ? (
                  <Skeleton className="h-6 w-11 rounded-full" />
                ) : (
                  <Toggle
                    checked={enabled}
                    busy={busy}
                    label={`${enabled ? 'Desactivar' : 'Activar'} ${mod.label}`}
                    onChange={(next) => void handleToggle(mod.key, next)}
                  />
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Interruptor accesible de marca (rol switch). */
function Toggle({
  checked,
  busy,
  label,
  onChange,
}: {
  checked: boolean;
  busy: boolean;
  label: string;
  onChange: (next: boolean) => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={busy}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 disabled:opacity-60',
        checked ? 'bg-brand-gradient' : 'bg-brand-100',
      ].join(' ')}
    >
      <span
        className={[
          'inline-flex size-5 items-center justify-center rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        ].join(' ')}
      >
        {busy ? <Loader2 className="size-3 animate-spin text-brand-500" aria-hidden="true" /> : null}
      </span>
    </button>
  );
}
