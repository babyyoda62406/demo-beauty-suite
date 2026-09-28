import * as React from 'react';
import { cn } from '../lib/cn';

/** Loading placeholder with a soft brand-tinted shimmer. */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-brand-100/60', className)}
      {...props}
    />
  );
}
