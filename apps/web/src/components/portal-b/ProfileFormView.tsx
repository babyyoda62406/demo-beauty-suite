'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Heart, Save, User } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
  Textarea,
  useToast,
} from '@/components/ui';
import { ErrorState, ImageUpload, getErrorMessage } from '@/components/common';
import { cn } from '@/lib/utils';
import { imageRef } from '@/lib/validation';
import {
  useMyProfile,
  useUpdateMyProfile,
  type UpdateMyProfileInput,
} from '@/lib/hooks/client-profile';

const COLOR_PALETTE: Array<{ name: string; hex: string }> = [
  { name: 'Magenta', hex: '#D6157F' },
  { name: 'Rosa nude', hex: '#F2C6D0' },
  { name: 'Rojo clásico', hex: '#B3122E' },
  { name: 'Borgoña', hex: '#5A1330' },
  { name: 'Lavanda', hex: '#B9A6E0' },
  { name: 'Champán', hex: '#E9D9B3' },
  { name: 'Blanco francés', hex: '#F7F3EE' },
  { name: 'Negro', hex: '#1A1420' },
];

const schema = z.object({
  name: z.string().trim().min(2, 'Introduce tu nombre completo').max(120),
  phone: z.string().trim().min(6, 'Introduce un teléfono válido').max(30),
  email: z.string().trim().email('Email no válido').or(z.literal('')),
  instagram: z.string().trim().max(60).or(z.literal('')),
  birthDate: z.string().or(z.literal('')),
  allergies: z.string().trim().max(500).or(z.literal('')),
  preferences: z.string().trim().max(500).or(z.literal('')),
  favoriteColors: z.string().trim().max(300).or(z.literal('')),
  photoUrl: imageRef(),
});

type ProfileValues = z.infer<typeof schema>;

const EMPTY_DEFAULTS: ProfileValues = {
  name: '',
  phone: '',
  email: '',
  instagram: '',
  birthDate: '',
  allergies: '',
  preferences: '',
  favoriteColors: '',
  photoUrl: '',
};

/** Ficha editable de la clienta: datos, preferencias y colores favoritos. */
export function ProfileFormView(): React.JSX.Element {
  const { toast } = useToast();
  const profileQuery = useMyProfile();
  const updateProfile = useUpdateMyProfile();

  const defaults = React.useMemo<ProfileValues>(() => {
    const p = profileQuery.data;
    if (!p) return EMPTY_DEFAULTS;
    return {
      name: p.name ?? '',
      phone: p.phone ?? '',
      email: p.email ?? '',
      instagram: p.instagram ?? '',
      birthDate: p.birthDate ? p.birthDate.slice(0, 10) : '',
      allergies: p.allergies ?? '',
      preferences: p.preferences ?? '',
      favoriteColors: p.favoriteColors ?? '',
      photoUrl: p.photoUrl ?? '',
    };
  }, [profileQuery.data]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  React.useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  const favoriteColors = watch('favoriteColors');
  const selected = React.useMemo(
    () => new Set(favoriteColors.split(',').map((c) => c.trim()).filter(Boolean)),
    [favoriteColors],
  );

  function toggleColor(name: string): void {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setValue('favoriteColors', Array.from(next).join(', '), { shouldDirty: true });
  }

  const onSubmit = handleSubmit((data) => {
    const payload: UpdateMyProfileInput = {
      name: data.name,
      phone: data.phone,
      ...(data.email ? { email: data.email } : {}),
      ...(data.instagram ? { instagram: data.instagram } : {}),
      ...(data.birthDate ? { birthDate: data.birthDate } : {}),
      ...(data.allergies ? { allergies: data.allergies } : {}),
      ...(data.preferences ? { preferences: data.preferences } : {}),
      ...(data.favoriteColors ? { favoriteColors: data.favoriteColors } : {}),
    };
    updateProfile.mutate(
      payload,
      {
        onSuccess: () =>
          toast({ variant: 'success', title: 'Perfil actualizado', description: 'Tus datos se han guardado.' }),
        onError: (error) =>
          toast({ variant: 'danger', title: 'No se pudo guardar', description: getErrorMessage(error) }),
      },
    );
  });

  if (profileQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <ErrorState
        error={profileQuery.error}
        title="Tu perfil no está disponible todavía"
        description="Estamos preparando esta sección. Mientras tanto, contacta con el salón para actualizar tus datos."
        onRetry={() => profileQuery.refetch()}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-4 text-brand-500" aria-hidden="true" />
            Tus datos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* La clienta también quiere su foto: la ve Aurora en su ficha. */}
          <ImageUpload
            label="Tu foto"
            aspect="square"
            value={watch('photoUrl') ?? ''}
            onChange={(url) => setValue('photoUrl', url, { shouldDirty: true })}
          />
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre completo</Label>
            <Input id="name" autoComplete="name" aria-invalid={errors.name ? true : undefined} {...register('name')} />
            {errors.name ? <FieldError message={errors.name.message} /> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" autoComplete="tel" aria-invalid={errors.phone ? true : undefined} {...register('phone')} />
              {errors.phone ? <FieldError message={errors.phone.message} /> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="birthDate">Fecha de nacimiento</Label>
              <Input id="birthDate" type="date" {...register('birthDate')} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" aria-invalid={errors.email ? true : undefined} {...register('email')} />
              {errors.email ? <FieldError message={errors.email.message} /> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="instagram">Instagram</Label>
              <Input id="instagram" placeholder="@tuusuario" {...register('instagram')} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="size-4 text-brand-500" aria-hidden="true" />
            Preferencias
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="allergies">Alergias o sensibilidades</Label>
            <Textarea id="allergies" rows={3} placeholder="Ej. alergia al níquel, piel sensible…" {...register('allergies')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="preferences">Preferencias de servicio</Label>
            <Textarea id="preferences" rows={3} placeholder="Ej. formas, largos, estilos que te gustan…" {...register('preferences')} />
          </div>
          <div className="space-y-2">
            <Label>Colores favoritos</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((color) => {
                const active = selected.has(color.name);
                return (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => toggleColor(color.name)}
                    aria-pressed={active}
                    title={color.name}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                      active
                        ? 'border-brand-400 bg-brand-50 text-brand-700 shadow-sm'
                        : 'border-brand-100 text-ink-soft hover:bg-surface-subtle',
                    )}
                  >
                    <span
                      className="size-3.5 rounded-full border border-black/10"
                      style={{ backgroundColor: color.hex }}
                      aria-hidden="true"
                    />
                    {color.name}
                  </button>
                );
              })}
            </div>
            <Input
              placeholder="Otros colores (separados por comas)"
              {...register('favoriteColors')}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 lg:col-span-2">
        {isDirty ? <span className="text-xs text-ink-soft/70">Tienes cambios sin guardar</span> : null}
        <Button type="submit" disabled={updateProfile.isPending || !isDirty}>
          <Save aria-hidden="true" />
          {updateProfile.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
}

function FieldError({ message }: { message?: string | undefined }): React.JSX.Element {
  return (
    <p role="alert" className="text-xs font-medium text-danger">
      {message}
    </p>
  );
}
