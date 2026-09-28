'use client';

import * as React from 'react';
import { Container } from '@/components/ui/container';
import { ErrorState } from '@/components/common';

/** Límite de error del listado del blog (SPEC: estado de error en cada vista). */
export default function BlogError({
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
          title="No se pudo cargar el blog"
          description="Ha ocurrido un problema al obtener los artículos. Inténtalo de nuevo en unos instantes."
          onRetry={reset}
        />
      </Container>
    </section>
  );
}
