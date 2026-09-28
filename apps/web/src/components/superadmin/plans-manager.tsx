'use client';

import * as React from 'react';
import { Check, Layers, Minus, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Skeleton,
  useToast,
} from '@/components/ui';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  MoneyText,
  getErrorMessage,
} from '@/components/common';
import {
  useCreatePlan,
  useDeletePlan,
  usePlans,
  useUpdatePlan,
  PLAN_LABELS,
  type Plan,
  type PlanInput,
  type PlanKey,
} from '@/lib/hooks/superadmin';
import { PlanFormDialog } from './plan-form-dialog';

/** CRUD de planes de plataforma presentado como rejilla de tarjetas (SPEC §6). */
export function PlansManager(): React.JSX.Element {
  const { toast } = useToast();
  const query = usePlans();
  const plans = query.data ?? [];

  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Plan | undefined>(undefined);
  const [deleting, setDeleting] = React.useState<Plan | undefined>(undefined);

  const usedKeys = plans.map((p) => p.key);

  const openCreate = (): void => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (plan: Plan): void => {
    setEditing(plan);
    setFormOpen(true);
  };

  const handleSubmit = async (values: PlanInput, isEdit: boolean): Promise<void> => {
    if (isEdit && editing) {
      const { key: _omit, ...data } = values;
      await updatePlan.mutateAsync({ key: editing.key, data });
      toast({ variant: 'success', title: 'Plan actualizado', description: values.name });
    } else {
      const created = await createPlan.mutateAsync(values);
      toast({ variant: 'success', title: 'Plan creado', description: created.name });
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleting) return;
    try {
      await deletePlan.mutateAsync(deleting.key);
      toast({ variant: 'success', title: 'Plan eliminado', description: deleting.name });
    } catch (error) {
      toast({ variant: 'danger', title: 'No se pudo eliminar', description: getErrorMessage(error) });
    } finally {
      setDeleting(undefined);
    }
  };

  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={openCreate} disabled={usedKeys.length >= 4}>
          <Plus className="size-4" aria-hidden="true" />
          Nuevo plan
        </Button>
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="mt-4 h-9 w-32" />
              <Skeleton className="mt-6 h-24 w-full" />
            </Card>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Sin planes"
          description="Crea el primer plan de la plataforma."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" aria-hidden="true" />
              Crear plan
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              onEdit={() => openEdit(plan)}
              onDelete={() => setDeleting(plan)}
            />
          ))}
        </div>
      )}

      <PlanFormDialog
        key={editing?.key ?? 'new'}
        open={formOpen}
        onOpenChange={setFormOpen}
        plan={editing}
        usedKeys={usedKeys}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleting !== undefined}
        onOpenChange={(next) => !next && setDeleting(undefined)}
        title="Eliminar plan"
        confirmLabel="Eliminar"
        description={
          deleting
            ? `¿Seguro que quieres eliminar el plan "${deleting.name}"? Los salones suscritos podrían verse afectados.`
            : undefined
        }
        onConfirm={handleDelete}
      />
    </div>
  );
}

/** Tarjeta premium de un plan con precio, flags de módulos y acciones. */
function PlanCard({
  plan,
  onEdit,
  onDelete,
}: {
  plan: Plan;
  onEdit: () => void;
  onDelete: () => void;
}): React.JSX.Element {
  const moduleFlags = Object.entries(plan.moduleFlags ?? {});
  const features = Object.entries(plan.features ?? {});

  return (
    <Card className="relative flex flex-col overflow-hidden p-6">
      <div
        className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-brand-gradient opacity-10 blur-2xl"
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant="outline">{PLAN_LABELS[plan.key as PlanKey] ?? plan.key}</Badge>
          <h3 className="mt-3 font-serif text-xl font-semibold tracking-tight text-ink">{plan.name}</h3>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Acciones de ${plan.name}`}>
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil className="size-4" aria-hidden="true" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDelete} className="text-danger focus:text-danger">
              <Trash2 className="size-4" aria-hidden="true" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="mt-4 flex items-baseline gap-1">
        <MoneyText cents={plan.priceMonthly} currency={plan.currency} className="font-serif text-3xl font-semibold text-ink" />
        <span className="text-sm text-ink-soft/70">/mes</span>
      </p>

      {(moduleFlags.length > 0 || features.length > 0) && (
        <ul className="mt-5 space-y-2 border-t border-brand-50 pt-4 text-sm">
          {moduleFlags.map(([key, value]) => {
            const on = Boolean(value);
            return (
              <li key={key} className="flex items-center gap-2">
                {on ? (
                  <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <Minus className="size-4 shrink-0 text-ink-soft/40" aria-hidden="true" />
                )}
                <span className={on ? 'text-ink' : 'text-ink-soft/50 line-through'}>{key}</span>
              </li>
            );
          })}
          {features.map(([key, value]) => (
            <li key={key} className="flex items-center gap-2 text-ink-soft">
              <span className="size-1.5 shrink-0 rounded-full bg-brand-300" aria-hidden="true" />
              <span className="capitalize">{key}:</span>
              <span className="font-medium text-ink">{String(value)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
