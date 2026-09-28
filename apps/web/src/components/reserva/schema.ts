import { z } from 'zod';

/**
 * Esquema del wizard de reserva pública. Un único formulario cuyos campos se
 * validan por tramos con `form.trigger(campos_del_paso)`.
 *
 * - `employeeId` vacío ('') significa «cualquier profesional» (la API asigna).
 * - `startAt` es el inicio del slot en ISO-8601 UTC (lo aporta la disponibilidad).
 */
export const bookingSchema = z.object({
  serviceId: z.string().min(1, 'Elige un servicio para continuar.'),
  employeeId: z.string().optional(),
  date: z.string().min(1, 'Elige un día.'),
  startAt: z.string().min(1, 'Elige una hora disponible.'),
  name: z
    .string()
    .trim()
    .min(2, 'Indícanos tu nombre.')
    .max(120, 'El nombre es demasiado largo.'),
  phone: z
    .string()
    .trim()
    .min(6, 'Introduce un teléfono válido.')
    .max(20, 'El teléfono es demasiado largo.'),
  email: z
    .union([z.literal(''), z.string().email('El correo no es válido.')])
    .optional(),
  notes: z.string().max(500, 'Máximo 500 caracteres.').optional(),
  consent: z
    .boolean()
    .refine((v) => v === true, { message: 'Debes aceptar la política de privacidad.' }),
});

export type BookingFormValues = z.input<typeof bookingSchema>;

/** Pasos del wizard, en orden. */
export const STEPS = [
  { id: 'servicio', label: 'Servicio' },
  { id: 'profesional', label: 'Profesional' },
  { id: 'fecha', label: 'Fecha y hora' },
  { id: 'datos', label: 'Tus datos' },
  { id: 'confirmar', label: 'Confirmación' },
] as const;

export type StepId = (typeof STEPS)[number]['id'];

/** Campos que deben validarse antes de avanzar desde cada paso. */
export const STEP_FIELDS: Record<StepId, (keyof BookingFormValues)[]> = {
  servicio: ['serviceId'],
  profesional: [], // «cualquier profesional» es válido → no bloquea
  fecha: ['date', 'startAt'],
  datos: ['name', 'phone', 'email', 'consent'],
  confirmar: [],
};
