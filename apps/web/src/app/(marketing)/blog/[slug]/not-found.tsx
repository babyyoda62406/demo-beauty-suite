import * as React from 'react';
import { FileQuestion } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { EmptyState } from '@/components/common';
import { Button } from '@fgd/ui';
import Link from 'next/link';

/** 404 de artículo: slug inexistente o no publicado. */
export default function BlogPostNotFound(): React.JSX.Element {
  return (
    <section className="py-24">
      <Container>
        <EmptyState
          icon={FileQuestion}
          title="Artículo no encontrado"
          description="Puede que el enlace sea incorrecto o que el artículo ya no esté publicado."
          action={
            <Button asChild>
              <Link href="/blog">Ir al blog</Link>
            </Button>
          }
        />
      </Container>
    </section>
  );
}
