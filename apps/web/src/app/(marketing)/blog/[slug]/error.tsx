'use client';

import * as React from 'react';
import { Container } from '@/components/ui/container';
import { ErrorState } from '@/components/common';

/** Límite de error del artículo individual (SPEC: estado de error en cada vista). */
export default function BlogPostError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="py-24">
      <Container>
        <ErrorState
          error={error}
          title="No se pudo cargar el artículo"
          description="Ha ocurrido un problema al obtener el contenido. Inténtalo de nuevo en unos instantes."
          onRetry={reset}
        />
      </Container>
    </section>
  );
}
