'use client';

/**
 * Filtro/leyenda de profesionales. Chips con el color de cada empleada; al
 * pulsar se filtra la agenda por esa profesional (selección única). "Todas"
 * limpia el filtro. Sirve además de leyenda de colores del calendario.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import type { AgendaEmployee } from '@/lib/hooks/bookings';

export interface EmployeeFilterProps {
  employees: AgendaEmployee[];
  /** Profesional seleccionada (undefined = todas). */
  value: string | undefined;
  onChange: (employeeId: string | undefined) => void;
}

export function EmployeeFilter({
  employees,
  value,
  onChange,
}: EmployeeFilterProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por profesional">
      <button
        type="button"
        aria-pressed={value === undefined}
        onClick={() => onChange(undefined)}
        className={cn(
          'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200',
          value === undefined
            ? 'border-brand-300 bg-brand-gradient text-white shadow-soft'
            : 'border-brand-100 bg-white text-ink-soft hover:bg-brand-50',
        )}
      >
        Todas
      </button>
      {employees.map((employee) => {
        const active = value === employee.id;
        return (
          <button
            key={employee.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? undefined : employee.id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200',
              active
                ? 'border-brand-300 bg-brand-50 text-brand-700 shadow-soft'
                : 'border-brand-100 bg-white text-ink-soft hover:bg-brand-50',
            )}
          >
            <span
              className="size-2.5 rounded-full ring-1 ring-black/5"
              style={{ backgroundColor: employee.color }}
              aria-hidden="true"
            />
            {employee.name}
          </button>
        );
      })}
    </div>
  );
}
