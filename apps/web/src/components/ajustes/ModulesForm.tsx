'use client';

import * as React from 'react';
import { Save } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  useToast,
} from '@/components/ui';
import { getErrorMessage } from '@/components/common';
import { Toggle } from './Toggle';
import {
  SETTING_KEYS,
  selectSetting,
  useUpsertSetting,
  type ModulesState,
  type Setting,
} from '@/lib/hooks/tenant';
import { MODULES, defaultModulesState } from './constants';

export interface ModulesFormProps {
  settings: Setting[] | undefined;
}

function buildState(settings: Setting[] | undefined): ModulesState {
  const stored = selectSetting<ModulesState>(settings, SETTING_KEYS.modules) ?? {};
  const base = defaultModulesState();
  return Object.fromEntries(
    MODULES.map((m) => [m.key, typeof stored[m.key] === 'boolean' ? stored[m.key]! : base[m.key]!]),
  );
}

/**
 * Activación de módulos del salón (toggles). Persiste el mapa completo
 * `{ [moduleKey]: boolean }` en el ajuste `modules.activation`.
 */
export function ModulesForm({ settings }: ModulesFormProps): React.JSX.Element {
  const { toast } = useToast();
  const mutation = useUpsertSetting();

  const initial = React.useMemo(() => buildState(settings), [settings]);
  const [state, setState] = React.useState<ModulesState>(initial);
  React.useEffect(() => setState(initial), [initial]);

  const dirty = React.useMemo(
    () => MODULES.some((m) => state[m.key] !== initial[m.key]),
    [state, initial],
  );

  const activeCount = MODULES.filter((m) => state[m.key]).length;

  function toggle(key: string, value: boolean) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function onSave() {
    mutation.mutate(
      { key: SETTING_KEYS.modules, valueJson: state },
      {
        onSuccess: () =>
          toast({ variant: 'success', title: 'Módulos actualizados', description: `${activeCount} módulos activos.` }),
        onError: (error) =>
          toast({ variant: 'danger', title: 'No se pudo guardar', description: getErrorMessage(error) }),
      },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-ink-soft/80">
          Activa o desactiva las funciones que quieres usar en tu salón.{' '}
          <span className="font-medium text-ink">{activeCount}</span> de {MODULES.length} activos.
        </p>
        <Button onClick={onSave} disabled={mutation.isPending || !dirty}>
          <Save aria-hidden="true" />
          {mutation.isPending ? 'Guardando…' : 'Guardar módulos'}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {MODULES.map((module) => {
          const Icon = module.icon;
          const checked = Boolean(state[module.key]);
          const id = `module-${module.key}`;
          return (
            <Card key={module.key} className="transition-shadow hover:shadow-soft">
              <CardContent className="flex items-start gap-4 p-5">
                <span
                  className={
                    checked
                      ? 'flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-soft'
                      : 'flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-300'
                  }
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor={id} className="cursor-pointer font-medium text-ink">
                      {module.label}
                    </label>
                    <Toggle
                      id={id}
                      checked={checked}
                      disabled={module.core}
                      onChange={(v) => toggle(module.key, v)}
                      aria-label={`${module.label}: ${checked ? 'activado' : 'desactivado'}`}
                    />
                  </div>
                  <p className="mt-1 text-sm text-ink-soft/75">{module.description}</p>
                  {module.core ? (
                    <p className="mt-1.5 text-xs font-medium text-brand-500">Módulo esencial · siempre activo</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
