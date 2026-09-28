'use client';

import * as React from 'react';
import { motion, type Variants } from 'framer-motion';

const variants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut', delay },
  }),
};

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Fade/rise reveal. Animates once shortly after mount so the content is always
 * revealed (robusto: no depende del IntersectionObserver ni de que el usuario
 * haga scroll, evitando secciones en blanco si el observer no dispara).
 */
export function Reveal({ children, delay = 0, className }: RevealProps): React.JSX.Element {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      animate="visible"
      viewport={{ once: true, margin: '-80px' }}
      custom={delay}
      variants={variants}
    >
      {children}
    </motion.div>
  );
}
