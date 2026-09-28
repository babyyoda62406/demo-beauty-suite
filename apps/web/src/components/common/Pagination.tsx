'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';

export interface PaginationProps {
  /** Página actual (1-based). */
  page: number;
  /** Total de páginas. */
  totalPages: number;
  /** Total de elementos (para el texto "X de Y"). */
  total?: number;
  /** Tamaño de página (para el texto de rango). */
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Genera la secuencia de páginas con elipsis: 1 … 4 5 6 … 20. */
function pageItems(page: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) items.push('ellipsis');
  for (let i = start; i <= end; i++) items.push(i);
  if (end < totalPages - 1) items.push('ellipsis');
  items.push(totalPages);
  return items;
}

/**
 * Paginación accesible con números, elipsis y texto de rango en es-ES.
 * Se oculta si solo hay una página (salvo que haya que mostrar el total).
 */
export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  className,
}: PaginationProps): React.JSX.Element | null {
  if (totalPages <= 1 && total === undefined) return null;

  const safePage = Math.min(Math.max(1, page), Math.max(1, totalPages));
  const items = pageItems(safePage, Math.max(1, totalPages));

  const rangeText =
    total !== undefined && pageSize
      ? `${formatNumber((safePage - 1) * pageSize + 1)}–${formatNumber(
          Math.min(safePage * pageSize, total),
        )} de ${formatNumber(total)}`
      : total !== undefined
        ? `${formatNumber(total)} resultados`
        : null;

  return (
    <nav
      aria-label="Paginación"
      className={cn('flex flex-col items-center gap-3 sm:flex-row sm:justify-between', className)}
    >
      {rangeText ? <p className="text-sm text-ink-soft/70">{rangeText}</p> : <span />}
      {totalPages > 1 ? (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1}
            aria-label="Página anterior"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          {items.map((item, i) =>
            item === 'ellipsis' ? (
              <span key={`e-${i}`} className="px-2 text-ink-soft/50" aria-hidden="true">
                …
              </span>
            ) : (
              <Button
                key={item}
                variant={item === safePage ? 'primary' : 'ghost'}
                size="icon"
                className="size-9"
                onClick={() => onPageChange(item)}
                aria-label={`Página ${item}`}
                aria-current={item === safePage ? 'page' : undefined}
              >
                {item}
              </Button>
            ),
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages}
            aria-label="Página siguiente"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </nav>
  );
}
