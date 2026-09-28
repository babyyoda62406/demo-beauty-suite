import * as React from 'react';
import { cn } from '@/lib/utils';

export interface StatGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Columnas en pantallas grandes (por defecto 4). */
  columns?: 2 | 3 | 4;
}

const COLS: Record<NonNullable<StatGridProps['columns']>, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
};

/** Rejilla responsive para {@link StatCard}s. */
export function StatGrid({
  columns = 4,
  className,
  children,
  ...props
}: StatGridProps): React.JSX.Element {
  return (
    <div className={cn('grid grid-cols-1 gap-4', COLS[columns], className)} {...props}>
      {children}
    </div>
  );
}
