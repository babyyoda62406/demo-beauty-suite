'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ImageIcon, Palette, Save, Sparkles } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  useToast,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/components/common';
import {
  useUpdateBrand,
  type Tenant,
  type TenantBrand,
} from '@/lib/hooks/tenant';
import {
  BODY_FONTS,
  DEFAULT_PRIMARY,
  DISPLAY_FONTS,
  PRIMARY_COLOR_KEY,
  fontStack,
} from './constants';

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const schema = z.object({
  primaryColor: z
    .string()
    .regex(HEX, 'Introduce un color hexadecimal válido (p.ej. #D6157F)'),
  logoUrl: z
    .string()
    .trim()
    .url('Debe ser una URL válida')
    .max(2048)
    .or(z.literal('')),
  displayFont: z.string(),
  bodyFont: z.string(),
});

type BrandingValues = z.infer<typeof schema>;

function brandToValues(brand: TenantBrand | null | undefined): BrandingValues {
  const colors = brand?.colors ?? {};
  const fonts = brand?.fonts ?? {};
  return {
    primaryColor: colors[PRIMARY_COLOR_KEY] ?? colors.primary ?? DEFAULT_PRIMARY,
    logoUrl: brand?.logoUrl ?? '',
    displayFont: fonts.display ?? DISPLAY_FONTS[0]!.value,
    bodyFont: fonts.body ?? fonts.sans ?? BODY_FONTS[0]!.value,
  };
}

export interface BrandingFormProps {
  tenant: Tenant;
}

/**
 * Editor de branding (marca blanca) con PREVISUALIZACIÓN en vivo: color primario
 * (picker + hex), logo por URL y tipografías. Persiste vía PATCH /tenants/me/brand.
 */
export function BrandingForm({ tenant }: BrandingFormProps): React.JSX.Element {
  const { toast } = useToast();
  const mutation = useUpdateBrand({
    onSuccess: () =>
      toast({ variant: 'success', title: 'Branding actualizado', description: 'Los cambios se han guardado.' }),
    onError: (error) =>
      toast({ variant: 'danger', title: 'No se pudo guardar', description: getErrorMessage(error) }),
  });

  const defaults = React.useMemo(() => brandToValues(tenant.brand), [tenant.brand]);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<BrandingValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  React.useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  const values = watch();

  const onSubmit = handleSubmit((data) => {
    const payload = {
      colors: { [PRIMARY_COLOR_KEY]: data.primaryColor },
      logoUrl: data.logoUrl.trim(),
      fonts: { display: data.displayFont, body: data.bodyFont },
    };
    mutation.mutate(payload, {
      onSuccess: (updated) => reset(brandToValues(updated.brand)),
    });
  });

  const isValidHex = HEX.test(values.primaryColor ?? '');

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_minmax(0,26rem)]">
      {/* --- Controles --- */}
      <Card className="order-2 lg:order-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="size-4 text-brand-500" aria-hidden="true" />
            Identidad visual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Color primario */}
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Color primario</Label>
            <p className="text-xs text-ink-soft/70">
              Se usa en botones, enlaces y acentos de tu marca.
            </p>
            <div className="flex items-center gap-3">
              <label
                className="relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-brand-100 shadow-sm"
                style={{ backgroundColor: isValidHex ? values.primaryColor : DEFAULT_PRIMARY }}
              >
                <input
                  type="color"
                  aria-label="Selector de color primario"
                  value={isValidHex ? values.primaryColor : DEFAULT_PRIMARY}
                  onChange={(e) => setValue('primaryColor', e.target.value.toUpperCase(), { shouldDirty: true })}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
              </label>
              <Input
                id="primaryColor"
                spellCheck={false}
                autoComplete="off"
                aria-invalid={errors.primaryColor ? true : undefined}
                className="max-w-40 font-mono uppercase"
                {...register('primaryColor')}
              />
              <div className="flex gap-1.5">
                {['#D6157F', '#E84393', '#C2185B', '#7A0B3A', '#9333EA'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    aria-label={`Usar ${preset}`}
                    onClick={() => setValue('primaryColor', preset, { shouldDirty: true })}
                    className="size-6 rounded-full border border-black/5 shadow-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-1"
                    style={{ backgroundColor: preset }}
                  />
                ))}
              </div>
            </div>
            {errors.primaryColor ? (
              <p role="alert" className="text-xs font-medium text-danger">
                {errors.primaryColor.message}
              </p>
            ) : null}
          </div>

          {/* Logo */}
          <div className="space-y-2">
            <Label htmlFor="logoUrl">URL del logotipo</Label>
            <Input
              id="logoUrl"
              type="url"
              inputMode="url"
              placeholder="https://…/logo.png"
              autoComplete="off"
              aria-invalid={errors.logoUrl ? true : undefined}
              {...register('logoUrl')}
            />
            {errors.logoUrl ? (
              <p role="alert" className="text-xs font-medium text-danger">
                {errors.logoUrl.message}
              </p>
            ) : (
              <p className="text-xs text-ink-soft/70">Recomendado: PNG con fondo transparente, mín. 240&nbsp;px.</p>
            )}
          </div>

          {/* Fuentes */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="displayFont">Fuente de títulos</Label>
              <FontSelect id="displayFont" {...register('displayFont')} options={DISPLAY_FONTS} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bodyFont">Fuente de cuerpo</Label>
              <FontSelect id="bodyFont" {...register('bodyFont')} options={BODY_FONTS} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-brand-100/60 pt-4">
            {isDirty ? (
              <span className="text-xs text-ink-soft/70">Tienes cambios sin guardar</span>
            ) : null}
            <Button type="submit" disabled={mutation.isPending || !isDirty}>
              <Save aria-hidden="true" />
              {mutation.isPending ? 'Guardando…' : 'Guardar branding'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* --- Previsualización en vivo --- */}
      <div className="order-1 lg:order-2 lg:sticky lg:top-4 lg:self-start">
        <BrandingPreview
          salonName={tenant.name}
          primary={isValidHex ? values.primaryColor : DEFAULT_PRIMARY}
          logoUrl={values.logoUrl}
          displayFont={values.displayFont}
          bodyFont={values.bodyFont}
        />
      </div>
    </form>
  );
}

// -----------------------------------------------------------------------------
// Select de fuente estilizado (nativo, reutiliza el look de fields.tsx)
// -----------------------------------------------------------------------------

const FontSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { options: readonly { value: string; label: string }[] }
>(function FontSelect({ options, className, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        'flex h-11 w-full appearance-none rounded-xl border border-brand-100 bg-white bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat px-4 py-2 pr-10 text-sm text-ink shadow-sm transition-colors',
        'focus-visible:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200',
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%239d0e4b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      }}
      {...rest}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
});

// -----------------------------------------------------------------------------
// Panel de previsualización en vivo
// -----------------------------------------------------------------------------

interface BrandingPreviewProps {
  salonName: string;
  primary: string;
  logoUrl: string;
  displayFont: string;
  bodyFont: string;
}

function BrandingPreview({
  salonName,
  primary,
  logoUrl,
  displayFont,
  bodyFont,
}: BrandingPreviewProps): React.JSX.Element {
  const [imgError, setImgError] = React.useState(false);
  React.useEffect(() => setImgError(false), [logoUrl]);

  const display = fontStack(displayFont, DISPLAY_FONTS);
  const body = fontStack(bodyFont, BODY_FONTS);
  const gradient = `linear-gradient(135deg, ${primary} 0%, color-mix(in srgb, ${primary} 70%, #000) 100%)`;
  const softBg = `color-mix(in srgb, ${primary} 8%, #fff)`;

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-soft/60">
        <Sparkles className="size-3.5 text-brand-400" aria-hidden="true" />
        Previsualización en vivo
      </p>
      <div className="overflow-hidden rounded-2xl border border-brand-100 shadow-card" style={{ fontFamily: body }}>
        {/* Hero */}
        <div className="relative px-6 py-10 text-center" style={{ background: gradient }}>
          <div className="mx-auto flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-white/90 shadow-sm">
            {logoUrl && !imgError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logotipo"
                className="size-full object-contain p-1"
                onError={() => setImgError(true)}
              />
            ) : (
              <ImageIcon className="size-7 text-ink-soft/40" aria-hidden="true" />
            )}
          </div>
          <h3 className="mt-4 text-2xl font-semibold text-white" style={{ fontFamily: display }}>
            {salonName || 'Tu salón'}
          </h3>
          <p className="mt-1 text-sm text-white/85">Belleza que se siente premium</p>
        </div>

        {/* Cuerpo */}
        <div className="space-y-4 bg-white px-6 py-6">
          <div className="flex flex-wrap gap-2">
            <span
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: softBg, color: primary }}
            >
              Manicura
            </span>
            <span
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: softBg, color: primary }}
            >
              Pestañas
            </span>
            <span
              className="rounded-full px-3 py-1 text-xs font-medium text-white"
              style={{ background: gradient }}
            >
              Nuevo
            </span>
          </div>
          <p className="text-sm leading-relaxed text-ink-soft/80">
            Así verán tus clientas los acentos, tipografías y el logotipo de tu marca en toda la plataforma.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              tabIndex={-1}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm"
              style={{ background: gradient }}
            >
              Reservar cita
            </button>
            <button
              type="button"
              tabIndex={-1}
              className="rounded-xl border px-4 py-2.5 text-sm font-medium"
              style={{ borderColor: primary, color: primary }}
            >
              Ver servicios
            </button>
          </div>
          <div className="flex items-center gap-2 pt-1">
            {[0.35, 0.55, 0.75, 1].map((op) => (
              <span
                key={op}
                className="h-6 flex-1 rounded-md"
                style={{ backgroundColor: `color-mix(in srgb, ${primary} ${op * 100}%, #fff)` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
