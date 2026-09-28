import * as React from 'react';
import { cn } from '@/lib/utils';

interface SectionTitleProps {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Editorial section numeral, e.g. "01". Rendered oversized alongside the eyebrow. */
  index?: string;
  align?: 'left' | 'center';
  className?: string;
}

/**
 * Editorial section heading: oversized numeral + eyebrow, a large Cormorant Garamond
 * title and a rose-gold hairline. Asymmetric by default (left aligned).
 */
export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  index,
  align = 'left',
  className,
}: SectionTitleProps): React.JSX.Element {
  const centered = align === 'center';

  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        centered ? 'items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-baseline gap-4',
          centered && 'justify-center',
        )}
      >
        {index ? <span className="section-index">{index}</span> : null}
        {eyebrow ? <span className="eyebrow pb-2">{eyebrow}</span> : null}
      </div>

      <h2 className="max-w-3xl font-serif text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1.02] text-ink">
        {title}
      </h2>

      {subtitle ? (
        <p
          className={cn(
            'max-w-2xl text-lg leading-relaxed text-ink-soft',
            centered && 'mx-auto',
          )}
        >
          {subtitle}
        </p>
      ) : null}

      <span
        className={cn(
          'mt-1 block h-px w-24 bg-gradient-to-r from-gold to-gold/0',
          centered && 'mx-auto from-gold/0 via-gold to-gold/0',
        )}
        aria-hidden="true"
      />
    </div>
  );
}
