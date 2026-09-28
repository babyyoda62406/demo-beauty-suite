import * as React from 'react';
import { Skeleton } from '@fgd/ui';
import { Container } from '@/components/ui/container';

/** Esqueleto de carga del artículo individual. */
export default function BlogPostLoading(): React.JSX.Element {
  return (
    <article className="py-20">
      <Container as="div" className="max-w-3xl">
        <Skeleton className="h-4 w-28 rounded-full" />
        <div className="mt-6 space-y-4">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-4 w-48 rounded-lg" />
        </div>
        <Skeleton className="mt-8 aspect-[16/9] w-full rounded-2xl" />
        <div className="mt-10 space-y-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-full rounded-lg" />
          ))}
        </div>
      </Container>
    </article>
  );
}
