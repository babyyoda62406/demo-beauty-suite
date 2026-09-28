'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { whatsappLink } from '@/lib/site';

/**
 * Botón flotante de WhatsApp, abajo a la derecha.
 *
 * Va dentro de una capa propia del tamaño de la ventana que recorta lo que
 * sobresalga: la onda `animate-ping` escala al doble y se salía por la derecha,
 * lo que provocaba scroll horizontal en móvil. Antes se tapaba con un
 * `overflow-x: clip` en `html`, pero eso desanclaba de la ventana a TODOS los
 * elementos `fixed` de la aplicación —incluidos los avisos—. Recortando aquí,
 * el efecto se ve igual y nadie más lo paga.
 */
export function WhatsAppFab(): React.JSX.Element {
  const t = useTranslations('cta');

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden={false}>
      <motion.a
        href={whatsappLink()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('whatsapp')}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: 'spring', stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="pointer-events-auto absolute bottom-6 right-6 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-white shadow-glow"
      >
        <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366]/60" />
        <MessageCircle className="size-6" />
        <span className="hidden text-sm font-semibold sm:inline">WhatsApp</span>
      </motion.a>
    </div>
  );
}
