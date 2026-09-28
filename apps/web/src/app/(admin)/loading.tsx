import * as React from 'react';
import { Skeleton } from '@fgd/ui';
import { BrandLoader } from '@/components/ui/brand-loader';

/** Loader del panel del salón: firma de marca + skeletons del contenido. */
export default function AdminLoading(): React.JSX.Element {
  return (
    <div className="space-y-8 p-6 lg:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <BrandLoader label="" className="hidden sm:flex" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>

      <Skeleton className="h-72 w-full rounded-2xl" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    </div>
  );
}
