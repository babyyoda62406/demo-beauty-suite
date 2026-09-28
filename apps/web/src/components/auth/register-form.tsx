'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button, Input, Label, toast } from '@fgd/ui';
import { ApiClientError, api } from '@/lib/api';

const registerSchema = z.object({
  name: z.string().min(2, 'Introduce tu nombre completo'),
  email: z.string().email('Introduce un correo válido'),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^\+?[0-9 ]{9,15}$/.test(value), {
      message: 'Introduce un teléfono válido',
    }),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string().min(8, 'Mínimo 8 caracteres'),
});

type RegisterValues = z.infer<typeof registerSchema>;

/** Client sign-up form (react-hook-form + zod) posting to the BFF `/api/auth/register`. */
export function RegisterForm(): React.JSX.Element {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', phone: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (values.password !== values.confirmPassword) {
      setError('confirmPassword', { message: 'Las contraseñas no coinciden' });
      return;
    }
    try {
      await api.post('/api/auth/register', {
        name: values.name,
        email: values.email,
        phone: values.phone ? values.phone : undefined,
        password: values.password,
      });
      toast({
        title: 'Cuenta creada',
        description: 'Bienvenida a Estudio Aurora',
        variant: 'success',
      });
      router.push('/portal');
      router.refresh();
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : 'No hemos podido crear tu cuenta.';
      setError('root', { message });
      toast({ title: 'Error al registrarte', description: message, variant: 'danger' });
    }
  });

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-serif text-3xl font-bold text-ink">
          Crea tu cuenta
        </h1>
        <p className="text-sm text-ink-soft/80">
          Reserva citas, sigue tu fidelización y guarda tus diseños favoritos.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="name">Nombre completo</Label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Laura García"
            aria-invalid={Boolean(errors.name)}
            {...register('name')}
          />
          {errors.name ? <p className="text-xs text-danger">{errors.name.message}</p> : null}
        </div>

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

        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono (opcional)</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+34 600 111 222"
            aria-invalid={Boolean(errors.phone)}
            {...register('phone')}
          />
          {errors.phone ? <p className="text-xs text-danger">{errors.phone.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
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
          {errors.password ? <p className="text-xs text-danger">{errors.password.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
          <Input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword ? (
            <p className="text-xs text-danger">{errors.confirmPassword.message}</p>
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
              Creando cuenta…
            </>
          ) : (
            'Crear cuenta'
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-soft/80">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-semibold text-brand-600 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
