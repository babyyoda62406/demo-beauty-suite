'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Building2, Clock, Save, Share2 } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  useToast,
} from '@/components/ui';
import { getErrorMessage } from '@/components/common';
import { Toggle } from './Toggle';
import {
  SETTING_KEYS,
  selectSetting,
  useUpdateBrand,
  useUpsertSetting,
  type BusinessProfile,
  type DayHours,
  type Setting,
  type Tenant,
  type WeekHours,
} from '@/lib/hooks/tenant';
import { SOCIAL_FIELDS, WEEKDAYS } from './constants';

type Socials = Record<string, string>;

interface BusinessValues {
  profile: Required<BusinessProfile>;
  socials: Socials;
  hours: WeekHours;
}

function buildDefaults(tenant: Tenant, settings: Setting[] | undefined): BusinessValues {
  const profile = selectSetting<BusinessProfile>(settings, SETTING_KEYS.businessProfile) ?? {};
  const storedHours = selectSetting<WeekHours>(settings, SETTING_KEYS.businessHours) ?? {};
  const socials = tenant.brand?.socials ?? {};

  const hours: WeekHours = {};
  for (const day of WEEKDAYS) {
    const d = storedHours[day.key];
    hours[day.key] = {
      closed: d?.closed ?? (day.key === 'sunday'),
      open: d?.open ?? '10:00',
      close: d?.close ?? '20:00',
    };
  }

  return {
    profile: {
      displayName: profile.displayName ?? tenant.name ?? '',
      phone: profile.phone ?? tenant.phone ?? '',
      whatsapp: profile.whatsapp ?? '',
      email: profile.email ?? tenant.email ?? '',
      address: profile.address ?? '',
      city: profile.city ?? '',
      postalCode: profile.postalCode ?? '',
      description: profile.description ?? '',
    },
    socials: Object.fromEntries(SOCIAL_FIELDS.map((f) => [f.key, socials[f.key] ?? ''])),
    hours,
  };
}

export interface BusinessFormProps {
  tenant: Tenant;
  settings: Setting[] | undefined;
}

/**
 * Datos del negocio: contacto (persistido en `Setting` business.profile),
 * horarios de apertura (`Setting` business.hours) y redes sociales
 * (`brand.socials`). Todo se guarda de forma autónoma por el OWNER.
 */
export function BusinessForm({ tenant, settings }: BusinessFormProps): React.JSX.Element {
  const { toast } = useToast();
  const upsertSetting = useUpsertSetting();
  const updateBrand = useUpdateBrand();
  const pending = upsertSetting.isPending || updateBrand.isPending;

  const defaults = React.useMemo(() => buildDefaults(tenant, settings), [tenant, settings]);
  const { register, handleSubmit, reset, watch, setValue } = useForm<BusinessValues>({
    defaultValues: defaults,
  });

  React.useEffect(() => reset(defaults), [defaults, reset]);

  const hoursValue = watch('hours');

  const onSubmit = handleSubmit(async (data) => {
    try {
      await upsertSetting.mutateAsync({
        key: SETTING_KEYS.businessProfile,
        valueJson: data.profile,
      });
      await upsertSetting.mutateAsync({
        key: SETTING_KEYS.businessHours,
        valueJson: data.hours as unknown as Record<string, unknown>,
      });
      // Redes sociales → merge en brand.socials (limpia entradas vacías).
      const socials = Object.fromEntries(
        Object.entries(data.socials).filter(([, v]) => v.trim() !== ''),
      );
      await updateBrand.mutateAsync({ socials });
      toast({ variant: 'success', title: 'Datos guardados', description: 'La información del negocio se ha actualizado.' });
    } catch (error) {
      toast({ variant: 'danger', title: 'No se pudo guardar', description: getErrorMessage(error) });
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Contacto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4 text-brand-500" aria-hidden="true" />
            Datos del negocio
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="displayName">Nombre comercial</Label>
            <Input id="displayName" {...register('profile.displayName')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" type="tel" inputMode="tel" {...register('profile.phone')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" type="tel" inputMode="tel" placeholder="+34 …" {...register('profile.whatsapp')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" inputMode="email" {...register('profile.email')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">Ciudad</Label>
            <Input id="city" {...register('profile.city')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" {...register('profile.address')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="postalCode">Código postal</Label>
            <Input id="postalCode" inputMode="numeric" {...register('profile.postalCode')} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Descripción breve</Label>
            <Textarea id="description" rows={3} placeholder="Cuéntale a tus clientas quién eres…" {...register('profile.description')} />
          </div>
        </CardContent>
      </Card>

      {/* Horarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4 text-brand-500" aria-hidden="true" />
            Horario de apertura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {WEEKDAYS.map((day) => {
            const closed = hoursValue?.[day.key]?.closed ?? false;
            return (
              <div
                key={day.key}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-100/70 bg-surface-subtle/40 px-4 py-2.5"
              >
                <span className="w-24 shrink-0 text-sm font-medium text-ink">{day.label}</span>
                <div className="flex items-center gap-2">
                  <Toggle
                    checked={!closed}
                    onChange={(v) => setValue(`hours.${day.key}.closed`, !v, { shouldDirty: true })}
                    aria-label={`${day.label}: ${closed ? 'cerrado' : 'abierto'}`}
                  />
                  <span className="w-16 text-xs text-ink-soft/70">{closed ? 'Cerrado' : 'Abierto'}</span>
                </div>
                <div className={closed ? 'pointer-events-none flex items-center gap-2 opacity-40' : 'flex items-center gap-2'}>
                  <Input
                    type="time"
                    aria-label={`${day.label}: apertura`}
                    className="h-9 w-32"
                    disabled={closed}
                    {...register(`hours.${day.key}.open`)}
                  />
                  <span aria-hidden="true" className="text-ink-soft/50">–</span>
                  <Input
                    type="time"
                    aria-label={`${day.label}: cierre`}
                    className="h-9 w-32"
                    disabled={closed}
                    {...register(`hours.${day.key}.close`)}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Redes sociales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Share2 className="size-4 text-brand-500" aria-hidden="true" />
            Redes sociales
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {SOCIAL_FIELDS.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={`social-${field.key}`}>{field.label}</Label>
              <Input
                id={`social-${field.key}`}
                type="url"
                inputMode="url"
                placeholder={field.placeholder}
                autoComplete="off"
                {...register(`socials.${field.key}`)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <Save aria-hidden="true" />
          {pending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
}

// Tipo auxiliar para asegurar que DayHours cubre las claves usadas.
export type { DayHours };
