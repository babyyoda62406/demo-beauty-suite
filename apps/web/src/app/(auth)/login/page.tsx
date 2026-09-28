'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Input, Label, toast } from '@fgd/ui';
import { ApiClientError, api } from '@/lib/api';

const loginSchema = z.object({
  email: z.string().email('Introduce un correo válido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

type LoginValues = z.infer<typeof loginSchema>;

/** Client login form (react-hook-form + zod) posting to the BFF `/api/auth/login`. */
export default function LoginPage(): React.JSX.Element {
  const t = useTranslations('auth.login');
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await api.post('/api/auth/login', values);
      toast({ title: 'Sesión iniciada', variant: 'success' });
      // Respeta el destino profundo (?next=...); el middleware corrige el área
      // según el rol si no coincide. Sólo se aceptan rutas internas.
      const rawNext = new URLSearchParams(window.location.search).get('next');
      const dest = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/portal';
      router.push(dest);
      router.refresh();
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : t('error');
      setError('root', { message });
      toast({ title: t('error'), description: message, variant: 'danger' });
    }
  });

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-serif text-3xl font-bold text-ink">{t('title')}</h1>
        <p className="text-sm text-ink-soft/80">{t('subtitle')}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">{t('email')}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
          />
          {errors.email ? (
            <p className="text-xs text-danger">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t('password')}</Label>
            <Link href="/recuperar" className="text-xs font-medium text-brand-600 hover:underline">
              {t('forgot')}
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={Boolean(errors.password)}
              className="pr-11"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft/60 transition hover:text-brand-600"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
          {errors.password ? (
            <p className="text-xs text-danger">{errors.password.message}</p>
          ) : null}
        </div>

        {errors.root ? (
          <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
            {errors.root.message}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" />
              {t('loading')}
            </>
          ) : (
            t('submit')
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-soft/80">
        {t('noAccount')}{' '}
        <Link href="/registro" className="font-semibold text-brand-600 hover:underline">
          {t('register')}
        </Link>
      </p>
    </div>
  );
}
