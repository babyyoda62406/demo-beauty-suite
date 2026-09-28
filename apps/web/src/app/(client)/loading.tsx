import * as React from 'react';
import { Skeleton } from '@fgd/ui';
import { BrandLoader } from '@/components/ui/brand-loader';

/** Loader del portal de clienta: firma de marca + skeletons del contenido. */
export default function ClientLoading(): React.JSX.Element {
  return (
    <div className="space-y-8 p-6 lg:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <BrandLoader label="" className="hidden sm:flex" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>

      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
