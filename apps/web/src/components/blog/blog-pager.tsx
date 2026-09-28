import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';

interface BlogPagerProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  /** Construye el href de una página dada (conserva filtros como `tag`). */
  hrefFor: (page: number) => string;
  className?: string;
}

/**
 * Paginación de blog basada en enlaces (Server Component friendly): sin
 * estado de cliente, cada número es una navegación real a `?page=n`.
 */
export function BlogPager({
  page,
  totalPages,
  total,
  pageSize,
  hrefFor,
  className,
}: BlogPagerProps): React.JSX.Element | null {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Paginación del blog"
      className={cn('flex flex-col items-center gap-3 sm:flex-row sm:justify-between', className)}
    >
      <p className="text-sm text-ink-soft/70">
        {formatNumber(from)}–{formatNumber(to)} de {formatNumber(total)} artículos
      </p>
      <div className="flex items-center gap-1">
        <PagerLink
          href={page > 1 ? hrefFor(page - 1) : undefined}
          label="Página anterior"
          disabled={page <= 1}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </PagerLink>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
          .reduce<Array<number | 'ellipsis'>>((acc, n, idx, arr) => {
            const prev = arr[idx - 1];
            if (prev !== undefined && n - prev > 1) acc.push('ellipsis');
            acc.push(n);
            return acc;
          }, [])
          .map((item, i) =>
            item === 'ellipsis' ? (
              <span key={`e-${i}`} className="px-2 text-ink-soft/50" aria-hidden="true">
                …
              </span>
            ) : (
              <PagerLink
                key={item}
                href={item === page ? undefined : hrefFor(item)}
                label={`Página ${item}`}
                current={item === page}
              >
                {item}
              </PagerLink>
            ),
          )}

        <PagerLink
          href={page < totalPages ? hrefFor(page + 1) : undefined}
          label="Página siguiente"
          disabled={page >= totalPages}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </PagerLink>
      </div>
    </nav>
  );
}

interface PagerLinkProps {
  href: string | undefined;
  label: string;
  current?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

function PagerLink({ href, label, current, disabled, children }: PagerLinkProps): React.JSX.Element {
  const base =
    'inline-flex size-9 items-center justify-center rounded-full text-sm font-medium transition-colors';
  const style = current
    ? 'bg-brand-gradient text-white shadow-soft'
    : disabled
      ? 'cursor-not-allowed text-ink-soft/30'
      : 'text-ink-soft hover:bg-brand-50 hover:text-brand-600';

  if (!href) {
    return (
      <span aria-hidden={disabled} aria-current={current ? 'page' : undefined} className={cn(base, style)}>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={current ? 'page' : undefined}
      className={cn(base, style)}
    >
      {children}
    </Link>
  );
}
