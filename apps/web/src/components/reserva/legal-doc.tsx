import * as React from 'react';
import { Container } from '@/components/ui';

export interface LegalSection {
  heading: string;
  /** Párrafos y/o listas (cadenas = párrafo; array = lista de viñetas). */
  body: (string | string[])[];
}

interface LegalDocProps {
  eyebrow: string;
  title: string;
  /** Fecha de última actualización legible (p.ej. "1 de agosto de 2026"). */
  updatedAt: string;
  intro?: string;
  sections: LegalSection[];
}

/**
 * Maquetación de documento legal (aviso legal / privacidad). Server component:
 * tipografía de marca, sin interactividad.
 */
export function LegalDoc({
  eyebrow,
  title,
  updatedAt,
  intro,
  sections,
}: LegalDocProps): React.JSX.Element {
  return (
    <div className="bg-brand-soft">
      <section className="relative overflow-hidden pt-16 sm:pt-24">
        <Container className="relative max-w-3xl">
          <div className="text-center">
            <span className="eyebrow">{eyebrow}</span>
            <h1 className="mt-4 font-serif text-4xl font-bold leading-tight text-ink sm:text-5xl">
              {title}
            </h1>
            <p className="mt-3 text-sm text-ink-soft/60">Última actualización: {updatedAt}</p>
          </div>
        </Container>
      </section>

      <section className="py-12 sm:py-16">
        <Container className="max-w-3xl">
          <article className="rounded-3xl border border-brand-100 bg-white/80 p-6 shadow-card backdrop-blur-sm sm:p-10">
            {intro ? (
              <p className="mb-8 text-base leading-relaxed text-ink-soft/80">{intro}</p>
            ) : null}

            <div className="space-y-8">
              {sections.map((section, i) => (
                <section key={section.heading} aria-labelledby={`sec-${i}`}>
                  <h2
                    id={`sec-${i}`}
                    className="font-serif text-xl font-semibold text-ink"
                  >
                    {i + 1}. {section.heading}
                  </h2>
                  <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-soft/80">
                    {section.body.map((block, j) =>
                      Array.isArray(block) ? (
                        <ul key={j} className="list-disc space-y-1.5 pl-5 marker:text-brand-400">
                          {block.map((item, k) => (
                            <li key={k}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p key={j}>{block}</p>
                      ),
                    )}
                  </div>
                </section>
              ))}
            </div>
          </article>

          <p className="mt-6 text-center text-xs text-ink-soft/55">
            Este texto es una plantilla informativa y deberá ser revisado y adaptado por un
            profesional antes de su publicación definitiva.
          </p>
        </Container>
      </section>
    </div>
  );
}
