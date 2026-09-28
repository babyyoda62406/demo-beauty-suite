import * as React from 'react';
import {
  AtSign,
  CalendarHeart,
  FlaskConical,
  Heart,
  Instagram,
  Mail,
  Palette,
  Phone,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Client } from '@/lib/hooks/clients';

/** Fila etiqueta/valor dentro de una tarjeta de información. */
function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode | null | undefined;
  href?: string | undefined;
}): React.JSX.Element {
  const empty = value === null || value === undefined || value === '';
  const content = empty ? <span className="text-ink-soft/40">Sin datos</span> : value;
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-soft/60">{label}</p>
        {href && !empty ? (
          <a
            href={href}
            className="break-words text-sm text-ink transition-colors hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            {content}
          </a>
        ) : (
          <p className="break-words text-sm text-ink">{content}</p>
        )}
      </div>
    </div>
  );
}

/** Panel con título serif. */
function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <Card className={cn('p-5', className)}>
      <h3 className="mb-1 font-serif text-lg font-semibold text-ink">{title}</h3>
      {children}
    </Card>
  );
}

/** Calcula la edad en años a partir de una fecha de nacimiento ISO. */
function ageFrom(birthISO: string): number | null {
  const birth = new Date(birthISO);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

/**
 * Pestaña "Información" de la ficha: contacto, cumpleaños, colores favoritos,
 * alergias y preferencias. Cada dato ausente se muestra de forma discreta.
 */
export function ClientInfo({ client }: { client: Client }): React.JSX.Element {
  const age = client.birthDate ? ageFrom(client.birthDate) : null;
  const colors = client.favoriteColors
    ? client.favoriteColors
        .split(/[,\n]/)
        .map((c) => c.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="Contacto">
        <div className="divide-y divide-brand-50">
          <InfoRow icon={Phone} label="Teléfono" value={client.phone} href={`tel:${client.phone}`} />
          <InfoRow
            icon={Mail}
            label="Correo electrónico"
            value={client.email}
            href={client.email ? `mailto:${client.email}` : undefined}
          />
          <InfoRow
            icon={Instagram}
            label="Instagram"
            value={client.instagram}
            href={
              client.instagram
                ? `https://instagram.com/${client.instagram.replace(/^@/, '')}`
                : undefined
            }
          />
        </div>
      </Panel>

      <Panel title="Cumpleaños">
        <div className="divide-y divide-brand-50">
          <InfoRow
            icon={CalendarHeart}
            label="Fecha"
            value={client.birthDate ? formatDate(client.birthDate) : undefined}
          />
          <InfoRow
            icon={Heart}
            label="Edad"
            value={age !== null ? `${age} años` : undefined}
          />
        </div>
      </Panel>

      <Panel title="Colores favoritos" className="lg:col-span-2">
        {colors.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {colors.map((color, i) => (
              <span
                key={`${color}-${i}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-surface-subtle/60 px-3 py-1 text-sm text-ink"
              >
                <Palette className="size-3.5 text-brand-400" aria-hidden="true" />
                {color}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1 flex items-center gap-2 text-sm text-ink-soft/50">
            <AtSign className="size-4" aria-hidden="true" />
            Sin colores favoritos registrados
          </p>
        )}
      </Panel>

      <Panel title="Alergias">
        <div className="mt-1 flex items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
            <FlaskConical className="size-4" aria-hidden="true" />
          </span>
          <p className="whitespace-pre-wrap text-sm text-ink">
            {client.allergies ? (
              client.allergies
            ) : (
              <span className="text-ink-soft/40">Sin alergias registradas</span>
            )}
          </p>
        </div>
      </Panel>

      <Panel title="Preferencias">
        <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
          {client.preferences ? (
            client.preferences
          ) : (
            <span className="text-ink-soft/40">Sin preferencias registradas</span>
          )}
        </p>
      </Panel>
    </div>
  );
}
