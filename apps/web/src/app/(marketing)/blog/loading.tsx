import * as React from 'react';
import { Skeleton } from '@fgd/ui';
import { Container } from '@/components/ui/container';

/** Esqueleto de carga del listado del blog (grid de tarjetas). */
export default function BlogLoading(): React.JSX.Element {
  return (
    <section className="relative py-24">
      <Container>
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3">
          <Skeleton className="h-4 w-28 rounded-full" />
          <Skeleton className="h-10 w-full max-w-md rounded-xl" />
          <Skeleton className="h-5 w-full max-w-lg rounded-lg" />
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-brand-100/70 bg-white shadow-card">
              <Skeleton className="aspect-[16/10] w-full rounded-none" />
              <div className="space-y-3 p-6">
                <Skeleton className="h-4 w-24 rounded-full" />
                <Skeleton className="h-5 w-full rounded-lg" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-2/3 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
