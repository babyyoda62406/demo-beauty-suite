import * as React from 'react';
import type { Metadata } from 'next';
import { CalendarHeart, ShieldCheck, Sparkles } from 'lucide-react';
import { Container } from '@/components/ui';
import { BookingWizard } from '@/components/reserva';

export const metadata: Metadata = {
  title: 'Reserva tu cita · Estudio Aurora',
  description:
    'Reserva online tu cita en Estudio Aurora en cuatro sencillos pasos, sin necesidad de registro.',
};

/** Página pública de reserva sin registro (SPEC §4). */
export default function ReservarPage(): React.JSX.Element {
  return (
    <div className="relative overflow-hidden bg-cream">
      <div className="pointer-events-none absolute inset-0 bg-warm-mesh opacity-40" aria-hidden="true" />

      {/* Encabezado */}
      <section className="relative pt-28 sm:pt-36">
        <Container className="relative">
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow inline-flex items-center gap-2.5">
              <span className="size-1.5 rounded-full bg-brand-500" aria-hidden="true" />
              Reserva online
            </span>
            <h1 className="mt-5 font-serif text-[clamp(2.25rem,6vw,3.75rem)] font-semibold leading-[1.02] text-ink">
              Tu próxima cita, a un par de clics
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-ink-soft">
              Elige tu servicio, tu profesional y la hora que mejor te venga. Sin registros ni
              esperas: nosotros nos encargamos del resto.
            </p>
            <span className="mx-auto mt-6 block h-px w-24 bg-gradient-to-r from-gold/0 via-gold to-gold/0" aria-hidden="true" />
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-soft">
              <li className="inline-flex items-center gap-1.5">
                <Sparkles className="size-4 text-brand-500" aria-hidden="true" />
                Sin registro
              </li>
              <li className="inline-flex items-center gap-1.5">
                <CalendarHeart className="size-4 text-brand-500" aria-hidden="true" />
                Confirmación rápida
              </li>
              <li className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-brand-500" aria-hidden="true" />
                Datos protegidos
              </li>
            </ul>
          </div>
        </Container>
      </section>

      {/* Wizard */}
      <section className="relative py-14 sm:py-20">
        <Container className="max-w-5xl">
          <BookingWizard />
        </Container>
      </section>
    </div>
  );
}
