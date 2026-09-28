'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, MessageCircle, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@fgd/ui';
import { whatsappLink } from '@/lib/site';
import { cn } from '@/lib/utils';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Editorial warm hero. Ivory canvas, oversized Cormorant Garamond headline with an italic
 * accent, and a tall portrait frame that overflows the grid with a rose-gold
 * filet + floating rating card. Parallax on the image; reveals are staggered.
 */
export function Hero(): React.JSX.Element {
  const t = useTranslations('hero');
  const reduce = useReducedMotion();

  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  // El parallax obliga a dar margen a la capa, y ese margen se come un 14% de
  // la foto. En el móvil el efecto apenas se aprecia y el recorte sí: allí la
  // imagen ocupa el marco exacto y no se mueve.
  const [conParallax, setConParallax] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const aplicar = (): void => setConParallax(mq.matches && !reduce);
    aplicar();
    mq.addEventListener('change', aplicar);
    return () => mq.removeEventListener('change', aplicar);
  }, [reduce]);

  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', conParallax ? '14%' : '0%']);

  const rise = {
    hidden: { opacity: 0, y: 26 },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: EASE, delay: 0.1 + i * 0.09 },
    }),
  };

  return (
    <section
      id="inicio"
      ref={ref}
      className="relative overflow-hidden bg-cream pb-12 pt-24 sm:pt-28 lg:pb-20"
    >
      {/* Warm atmospheric wash. */}
      <div className="pointer-events-none absolute inset-0 bg-warm-mesh opacity-70" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -right-32 top-10 hidden size-[36rem] rounded-full bg-brand-100/40 blur-3xl lg:block"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-5 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:px-8">
        {/* Copy column */}
        <div className="relative z-10 max-w-2xl">
          <motion.span
            custom={0}
            variants={rise}
            initial="hidden"
            animate="show"
            className="inline-flex items-center gap-2.5 rounded-full border border-gold/40 bg-surface/70 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-ink-soft backdrop-blur-sm"
          >
            <span className="size-1.5 rounded-full bg-brand-500" />
            {t('eyebrow')}
          </motion.span>

          <motion.h1
            custom={1}
            variants={rise}
            initial="hidden"
            animate="show"
            className="mt-6 font-serif text-[clamp(2.5rem,5.4vw,4rem)] font-semibold leading-[1.02] text-ink"
          >
            {t('title')}
          </motion.h1>

          <motion.p
            custom={2}
            variants={rise}
            initial="hidden"
            animate="show"
            className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg"
          >
            {t('subtitle')}
          </motion.p>

          <motion.div
            custom={3}
            variants={rise}
            initial="hidden"
            animate="show"
            className="mt-7 flex flex-wrap items-center gap-3"
          >
            <Button asChild size="lg">
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                <MessageCircle />
                {t('ctaPrimary')}
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-ink/20 bg-transparent text-ink hover:bg-ink/5"
            >
              <a href="#servicios">
                {t('ctaSecondary')}
                <ArrowRight />
              </a>
            </Button>
          </motion.div>

          {/* Propuestas de valor cualitativas (sin cifras: la clienta no ha
              facilitado métricas reales de clientas/diseños/valoración). */}
          <motion.dl
            custom={4}
            variants={rise}
            initial="hidden"
            animate="show"
            className="mt-9 flex flex-wrap items-start gap-x-10 gap-y-5 border-t border-gold/25 pt-6"
          >
            {([
              { title: t('stats.custom.title'), label: t('stats.custom.label') },
              { title: t('stats.hygiene.title'), label: t('stats.hygiene.label') },
              { title: t('stats.booking.title'), label: t('stats.booking.label') },
            ] satisfies Array<{ title: string; label: string }>).map((stat) => (
              <div key={stat.title} className="max-w-[10rem]">
                <dt className="font-serif text-xl font-semibold leading-tight text-ink">
                  {stat.title}
                </dt>
                <dd className="mt-1 text-sm text-ink-soft">{stat.label}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        {/* Image column — tall frame that overflows the grid. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: EASE, delay: 0.15 }}
          className="relative mx-auto w-full max-w-md lg:max-w-none"
        >
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[2rem] border border-gold/40 shadow-card lg:aspect-[4/5] lg:-mr-6 lg:h-[34rem]">
            {/* Fallback en negro elegante detrás del retrato (el blazer de Aurora
                aporta el toque negro que pidió la clienta, RONDA 1 pto 9). */}
            <div
              className="absolute inset-0"
              style={{ backgroundImage: 'linear-gradient(150deg, hsl(330 30% 24%), hsl(330 20% 10%))' }}
              aria-hidden="true"
            />
            {/* Con parallax la capa necesita un 14% extra de alto por arriba
                —justo su recorrido— o al bajar asoma el degradado de respaldo
                como una franja oscura. Sin parallax no hace falta margen, así
                que la foto se ve entera. */}
            <motion.div
              style={{ y: imgY }}
              className={cn(
                'absolute left-0 w-full',
                conParallax ? '-top-[14%] h-[114%]' : 'inset-0',
              )}
            >
              <Image
                src="/brand/salon-1.jpg"
                alt="Estudio Aurora en su estudio de uñas en Ciudad Demo"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover object-[55%_6%]"
              />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-ink/40 via-transparent to-transparent" />
          </div>

          {/* Floating rating card. */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.6 }}
            className="absolute -bottom-6 left-2 flex items-center gap-3 rounded-2xl border border-gold/30 bg-surface/95 px-5 py-4 shadow-card backdrop-blur-sm sm:-left-6"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-brand-gradient text-white">
              <Star className="size-5 fill-white" />
            </span>
            <div className="leading-tight">
              <p className="font-serif text-xl font-semibold text-ink">Belleza y técnica</p>
              <p className="text-xs text-ink-soft">cuidado en cada detalle</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
