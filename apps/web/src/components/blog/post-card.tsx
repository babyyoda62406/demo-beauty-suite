import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { Badge } from '@fgd/ui';
import { formatDate } from '@/lib/format';
import type { BlogPost } from '@/lib/hooks/blog';
import { mediaUrl } from '@/lib/media';

interface PostCardProps {
  post: BlogPost;
}

/** Tarjeta de artículo para el listado del blog: portada, tags, título y extracto. */
export function PostCard({ post }: PostCardProps): React.JSX.Element {
  const hue = hashHue(post.slug);

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-brand-100/70 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-glow focus-visible:-translate-y-1 focus-visible:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        {post.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote CMS-hosted covers, domains not known ahead of time.
          <img
            src={mediaUrl(post.coverUrl)}
            alt=""
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div
            className="size-full transition-transform duration-500 group-hover:scale-105"
            style={{
              backgroundImage: `linear-gradient(135deg, hsl(${hue} 85% 72%), hsl(${hue - 20} 70% 42%))`,
            }}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6">
        {post.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="brand">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}

        <h3 className="font-serif text-lg font-semibold leading-snug text-ink transition-colors group-hover:text-brand-600">
          {post.title}
        </h3>

        {post.excerpt ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-ink-soft/80">{post.excerpt}</p>
        ) : null}

        <div className="mt-auto flex items-center justify-between pt-2 text-sm text-ink-soft/70">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden="true" />
            {post.publishedAt ? formatDate(post.publishedAt) : 'Sin fecha'}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-brand-600 transition-transform group-hover:translate-x-0.5">
            Leer más
            <ArrowRight className="size-4" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Deterministic hue (0–359) derived from a string, for gradient fallbacks. */
function hashHue(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}
