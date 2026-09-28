'use client';

import * as React from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button, Input, Label } from '@fgd/ui';
import { api } from '@/lib/api';

const forgotSchema = z.object({
  email: z.string().email('Introduce un correo válido'),
});

type ForgotValues = z.infer<typeof forgotSchema>;

/**
 * Password-recovery request form. Posts to the BFF `/api/auth/forgot-password`
 * (proxying `POST /api/v1/auth/forgot-password` — // TODO(external): el
 * endpoint aún no existe en la API, ver apps/api/src/auth/auth.controller.ts).
 * Por seguridad, siempre mostramos el mismo mensaje de éxito, exista o no la
 * cuenta y responda o no el backend, para no filtrar qué correos están dados
 * de alta.
 */
export function ForgotPasswordForm(): React.JSX.Element {
  const [sent, setSent] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await api.post('/api/auth/forgot-password', values);
    } catch {
      // Silenciado a propósito: no revelamos si el correo existe ni si el
      // endpoint está disponible todavía.
    } finally {
      setSent(true);
    }
  });

  if (sent) {
    return (
      <div className="space-y-6">
        <div className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <CheckCircle2 className="size-7" />
        </div>
        <div className="space-y-2">
          <h1 className="font-serif text-3xl font-bold text-ink">Revisa tu correo</h1>
          <p className="text-sm text-ink-soft/80">
            Si existe una cuenta con ese correo, te hemos enviado instrucciones para restablecer
            tu contraseña.
          </p>
        </div>
        <Link href="/login" className="text-sm font-semibold text-brand-600 hover:underline">
          Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-serif text-3xl font-bold text-ink">Recupera tu contraseña</h1>
        <p className="text-sm text-ink-soft/80">
          Introduce tu correo y te enviaremos instrucciones para restablecerla.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
          />
          {errors.email ? <p className="text-xs text-danger">{errors.email.message}</p> : null}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" />
              Enviando…
            </>
          ) : (
            'Enviar instrucciones'
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-soft/80">
        ¿Recordaste tu contraseña?{' '}
        <Link href="/login" className="font-semibold text-brand-600 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
