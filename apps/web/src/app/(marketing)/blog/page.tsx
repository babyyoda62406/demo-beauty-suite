import * as React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { SectionTitle } from '@/components/ui/section-title';
import { EmptyState } from '@/components/common';
import { PostCard, BlogPager } from '@/components/blog';
import { getPublicBlogPosts } from '@/lib/hooks/blog';

const PAGE_SIZE = 9;

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Consejos, tendencias y novedades de manicura y nail art del equipo de Estudio Aurora.',
  openGraph: {
    title: 'Blog · Estudio Aurora',
    description:
      'Consejos, tendencias y novedades de manicura y nail art del equipo de Estudio Aurora.',
    type: 'website',
  },
};

interface BlogPageProps {
  searchParams: Promise<{ page?: string; tag?: string }>;
}

/** Listado público del blog: portadas, tags, extracto y paginación (SPEC §6/§9). */
export default async function BlogPage({ searchParams }: BlogPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const tag = params.tag?.trim() || undefined;

  const { data: posts, meta } = await getPublicBlogPosts({ page, pageSize: PAGE_SIZE, tag });

  const hrefFor = (targetPage: number): string => {
    const search = new URLSearchParams();
    if (targetPage > 1) search.set('page', String(targetPage));
    if (tag) search.set('tag', tag);
    const qs = search.toString();
    return qs ? `/blog?${qs}` : '/blog';
  };

  return (
    <section className="relative py-24">
      <Container>
        <SectionTitle
          eyebrow="Nuestro blog"
          title="Consejos y tendencias de nail art"
          subtitle="Inspiración, cuidados y las últimas novedades directamente desde nuestro estudio."
        />

        {tag ? (
          <p className="mt-6 text-center text-sm text-ink-soft/70">
            Mostrando artículos con la etiqueta{' '}
            <span className="font-semibold text-brand-600">#{tag}</span> ·{' '}
            <Link href="/blog" className="underline decoration-brand-300 underline-offset-2 hover:text-brand-600">
              ver todos
            </Link>
          </p>
        ) : null}

        {posts.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Todavía no hay artículos publicados"
            description="Muy pronto compartiremos consejos y tendencias de nail art aquí. ¡Vuelve pronto!"
            className="mt-12"
          />
        ) : (
          <>
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>

            <BlogPager
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              pageSize={meta.pageSize}
              hrefFor={hrefFor}
              className="mt-14"
            />
          </>
        )}
      </Container>
    </section>
  );
}
