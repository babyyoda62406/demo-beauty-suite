import * as React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { Badge } from '@fgd/ui';
import { Container } from '@/components/ui/container';
import { PostContent } from '@/components/blog';
import { formatDate } from '@/lib/format';
import { getPublicBlogPostBySlug } from '@/lib/hooks/blog';
import { mediaUrl } from '@/lib/media';

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublicBlogPostBySlug(slug);

  if (!post) {
    return { title: 'Artículo no encontrado' };
  }

  const description = post.excerpt ?? undefined;

  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      publishedTime: post.publishedAt ?? undefined,
      tags: post.tags,
      images: post.coverUrl ? [{ url: post.coverUrl }] : undefined,
    },
  };
}

/** Artículo individual del blog público, con MDX renderizado y metadatos SEO (SPEC §6/§9). */
export default async function BlogPostPage({ params }: PostPageProps): Promise<React.JSX.Element> {
  const { slug } = await params;
  const post = await getPublicBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="relative py-20">
      <Container as="div" className="max-w-3xl">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver al blog
        </Link>

        <header className="mt-6 space-y-4">
          {post.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`}>
                  <Badge variant="brand">{tag}</Badge>
                </Link>
              ))}
            </div>
          ) : null}

          <h1 className="font-serif text-3xl font-bold leading-tight text-ink sm:text-4xl md:text-5xl">
            {post.title}
          </h1>

          <div className="flex items-center gap-1.5 text-sm text-ink-soft/70">
            <CalendarDays className="size-4" aria-hidden="true" />
            {post.publishedAt ? formatDate(post.publishedAt) : 'Sin fecha de publicación'}
          </div>
        </header>

        {post.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote CMS-hosted covers, domains not known ahead of time.
          <img
            src={mediaUrl(post.coverUrl)}
            alt=""
            className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover shadow-card"
          />
        ) : null}

        <div className="mt-10">
          <PostContent contentMdx={post.contentMdx} />
        </div>

        <footer className="mt-16 border-t border-brand-100/70 pt-8 text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-soft transition-transform hover:-translate-y-0.5"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Ver todos los artículos
          </Link>
        </footer>
      </Container>
    </article>
  );
}
