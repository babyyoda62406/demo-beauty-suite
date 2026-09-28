'use client';

import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CalendarHeart, Loader2 } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { formatDate, formatTime, formatWeekday } from '@/lib/format';
import {
  useCreatePublicBooking,
  usePublicServices,
  usePublicTeam,
  type CreatePublicBookingInput,
} from '@/lib/hooks/reserva';
import { bookingSchema, STEPS, STEP_FIELDS, type BookingFormValues } from './schema';
import { ProgressSteps } from './progress';
import { ServiceStep } from './service-step';
import { ProfessionalStep } from './professional-step';
import { DateTimeStep } from './datetime-step';
import { ContactStep } from './contact-step';
import { BookingSummary } from './summary';
import { Confirmation, type ConfirmationData } from './confirmation';

const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
};

const STEP_HEADINGS = [
  { title: 'Elige tu servicio', subtitle: 'Selecciona el tratamiento que quieres disfrutar.' },
  { title: 'Con quién quieres ir', subtitle: 'Escoge profesional o déjanos asignarte a la mejor persona.' },
  { title: '¿Cuándo te viene bien?', subtitle: 'Elige el día y la hora que prefieras.' },
  { title: 'Tus datos de contacto', subtitle: 'Solo necesitamos lo justo para confirmar tu cita.' },
  { title: 'Confirma tu reserva', subtitle: 'Revisa que todo esté correcto y confirma.' },
] as const;

/** Wizard de reserva pública (sin registro). Ver SPEC §4/§7. */
export function BookingWizard(): React.JSX.Element {
  const { toast } = useToast();
  const [step, setStep] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
  const [done, setDone] = React.useState<ConfirmationData | null>(null);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    mode: 'onTouched',
    defaultValues: {
      serviceId: '',
      employeeId: '',
      date: '',
      startAt: '',
      name: '',
      phone: '',
      email: '',
      notes: '',
      consent: false,
    },
  });

  const { data: services } = usePublicServices();
  const { data: team } = usePublicTeam();
  const createBooking = useCreatePublicBooking();

  const isLast = step === STEPS.length - 1;
  const currentStep = STEPS[step] ?? STEPS[0];
  const heading = STEP_HEADINGS[step] ?? STEP_HEADINGS[0];

  const goNext = async (): Promise<void> => {
    const fields = STEP_FIELDS[currentStep.id];
    const valid = fields.length === 0 ? true : await form.trigger(fields);
    if (!valid) return;
    setDirection(1);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = (): void => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const payload: CreatePublicBookingInput = {
      serviceId: values.serviceId,
      startAt: new Date(values.startAt).toISOString(),
      name: values.name.trim(),
      phone: values.phone.trim(),
      ...(values.employeeId ? { employeeId: values.employeeId } : {}),
      ...(values.email ? { email: values.email.trim() } : {}),
      ...(values.notes ? { notes: values.notes.trim() } : {}),
    };

    try {
      await createBooking.mutateAsync(payload);
      const service = services?.find((s) => s.id === values.serviceId);
      const member = values.employeeId
        ? team?.find((m) => m.id === values.employeeId)
        : undefined;
      setDone({
        serviceName: service?.name ?? 'Servicio',
        professionalName: member?.name ?? 'Cualquier profesional',
        dateLabel: `${formatWeekday(values.date)}, ${formatDate(values.date, "d 'de' MMMM")}`,
        timeLabel: formatTime(values.startAt),
      });
    } catch (err) {
      toast({
        variant: 'danger',
        title: 'No se pudo completar la reserva',
        description:
          err instanceof Error ? err.message : 'Inténtalo de nuevo en unos minutos.',
      });
    }
  });

  if (done) {
    return <Confirmation data={done} />;
  }

  return (
    <FormProvider {...form}>
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        {/* Columna principal */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isLast) void onSubmit();
            else void goNext();
          }}
          className="min-w-0"
        >
          <div className="rounded-[1.75rem] border border-gold/30 bg-surface/85 p-6 shadow-card backdrop-blur-sm sm:p-8">
            <ProgressSteps current={step} />

            <div className="mt-8">
              <h2 className="font-serif text-3xl font-semibold text-ink">{heading.title}</h2>
              <p className="mt-1.5 text-sm text-ink-soft">{heading.subtitle}</p>
            </div>

            <div className="relative mt-6 overflow-hidden">
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                <motion.div
                  key={currentStep.id}
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  {step === 0 && <ServiceStep />}
                  {step === 1 && <ProfessionalStep />}
                  {step === 2 && <DateTimeStep />}
                  {step === 3 && <ContactStep />}
                  {step === 4 && (
                    <div className="lg:hidden">
                      <BookingSummary variant="review" />
                    </div>
                  )}
                  {step === 4 && (
                    <p className="mt-4 text-sm text-ink-soft/70">
                      Al confirmar, crearemos tu solicitud de cita. Recibirás la confirmación
                      definitiva por parte del salón.
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navegación */}
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-gold/25 pt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={goBack}
                disabled={step === 0 || createBooking.isPending}
                className={step === 0 ? 'invisible' : ''}
              >
                <ArrowLeft />
                Atrás
              </Button>

              {isLast ? (
                <Button type="submit" size="lg" disabled={createBooking.isPending}>
                  {createBooking.isPending ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    <>
                      <CalendarHeart />
                      Confirmar reserva
                    </>
                  )}
                </Button>
              ) : (
                <Button type="submit" size="lg">
                  Continuar
                  <ArrowRight />
                </Button>
              )}
            </div>
          </div>
        </form>

        {/* Resumen lateral (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <BookingSummary />
          </div>
        </aside>
      </div>
    </FormProvider>
  );
}
