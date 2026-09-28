'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CalendarDays, CheckCircle2, Clock, MessageCircle, Scissors, User } from 'lucide-react';
import { Button } from '@/components/ui';
import { whatsappLink } from '@/lib/site';

/** Datos ya resueltos de la cita creada, para el mensaje de éxito. */
export interface ConfirmationData {
  serviceName: string;
  professionalName: string;
  dateLabel: string;
  timeLabel: string;
}

/** Pantalla de éxito tras crear la reserva (cita PENDING pendiente de confirmar). */
export function Confirmation({ data }: { data: ConfirmationData }): React.JSX.Element {
  const rows = [
    { icon: Scissors, label: 'Servicio', value: data.serviceName },
    { icon: User, label: 'Profesional', value: data.professionalName },
    { icon: CalendarDays, label: 'Fecha', value: data.dateLabel },
    { icon: Clock, label: 'Hora', value: `${data.timeLabel} h` },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="mx-auto max-w-xl text-center"
    >
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 14 }}
        className="mx-auto flex size-20 items-center justify-center rounded-full bg-brand-gradient text-white shadow-glow"
      >
        <CheckCircle2 className="size-10" aria-hidden="true" />
      </motion.span>

      <h2 className="mt-6 font-serif text-3xl font-bold text-ink">¡Reserva recibida!</h2>
      <p className="mx-auto mt-3 max-w-md text-ink-soft/75">
        Hemos registrado tu solicitud. Te confirmaremos la cita muy pronto. Si necesitas
        cambiar algo, escríbenos por WhatsApp.
      </p>

      <div className="mt-8 overflow-hidden rounded-3xl border border-gold/30 bg-surface text-left shadow-card">
        <dl className="divide-y divide-gold/20 px-6 py-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-3 py-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream-deep text-brand-600">
                <row.icon className="size-4" />
              </span>
              <div className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-soft/55">
                  {row.label}
                </dt>
                <dd className="truncate text-sm font-semibold text-ink">{row.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/">Volver al inicio</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
            <MessageCircle />
            Escríbenos por WhatsApp
          </a>
        </Button>
      </div>
    </motion.div>
  );
}
