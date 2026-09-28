'use client';

import * as React from 'react';
import { Check, ImagePlus, Link2, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { mediaUrl } from '@/lib/media';

/** Tipos aceptados por el backend (`uploads.controller.ts`). */
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
/** Límite del backend (~8 MB). Se valida también en cliente para fallar antes. */
const MAX_SIZE = 8 * 1024 * 1024;
/** Endpoint de subida a través del proxy BFF (campo `file`, multipart). */
const UPLOAD_URL = '/api/proxy/uploads';
/** Importación de una imagen alojada en otro sitio: se descarga y se guarda aquí. */
const IMPORT_URL = '/api/proxy/uploads/from-url';

/** De dónde saca la foto quien rellena el formulario. */
type Source = 'file' | 'url';

export interface ImageUploadProps {
  /** URL actual (`/uploads/<x>` o vacío). */
  value?: string | null | undefined;
  /** Se invoca con la nueva URL relativa tras subir (o `''` al quitar). */
  onChange: (url: string) => void;
  /** Texto de la etiqueta superior. */
  label?: string;
  /** Relación de aspecto de la vista previa. */
  aspect?: 'square' | 'video' | 'portrait';
  className?: string;
  disabled?: boolean;
}

const ASPECT: Record<NonNullable<ImageUploadProps['aspect']>, string> = {
  square: 'aspect-square',
  video: 'aspect-video',
  portrait: 'aspect-[3/4]',
};

/**
 * Ancho máximo de la vista previa por aspecto.
 *
 * Manda el ancho porque la altura sale de él (aspect-ratio). Con la vista
 * previa a ancho completo, en un diálogo se comía la pantalla y empujaba fuera
 * los botones de «Quitar» y el resto de campos: había que hacer scroll dentro
 * del modal para terminar de rellenarlo. Estos topes dejan la previa en unos
 * 12 rem de alto en los tres formatos.
 */
const MAX_W: Record<NonNullable<ImageUploadProps['aspect']>, string> = {
  square: 'max-w-[12rem]',
  video: 'max-w-[21rem]',
  portrait: 'max-w-[9rem]',
};

/**
 * Campo de subida de imagen reutilizable (formularios RHF y uso suelto).
 * Sube por `POST` multipart al BFF, muestra progreso real (XHR) y vista previa,
 * y devuelve la `url` relativa (`/uploads/<x>`) vía `onChange`. Valida tipo y
 * tamaño en cliente antes de enviar.
 */
export function ImageUpload({
  value,
  onChange,
  label = 'Foto',
  aspect = 'square',
  className,
  disabled = false,
}: ImageUploadProps): React.JSX.Element {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const xhrRef = React.useRef<XMLHttpRequest | null>(null);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [source, setSource] = React.useState<Source>('file');
  const [link, setLink] = React.useState('');
  const [checking, setChecking] = React.useState(false);
  const [imported, setImported] = React.useState(false);

  const uploading = progress !== null;
  const busy = uploading || checking;

  React.useEffect(() => {
    // Cancela cualquier subida en curso al desmontar.
    return () => xhrRef.current?.abort();
  }, []);

  /**
   * Trae la imagen del enlace a nuestro servidor. No se guarda la dirección
   * ajena: si mañana ese sitio la borra, la web de la clienta se quedaría con
   * un hueco. El backend valida que sea una imagen de verdad.
   */
  const importFromLink = React.useCallback(async (): Promise<void> => {
    const raw = link.trim();
    setError(null);
    setImported(false);
    if (!raw) {
      setError('Pega primero la dirección de la imagen.');
      return;
    }
    if (!/^https?:\/\//i.test(raw)) {
      setError('La dirección debe empezar por https://');
      return;
    }

    setChecking(true);
    try {
      const response = await fetch(IMPORT_URL, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: raw }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const url =
        payload && typeof payload === 'object'
          ? ((payload as { data?: { url?: string }; url?: string }).data?.url ??
            (payload as { url?: string }).url)
          : undefined;

      if (!response.ok || !url) {
        const message =
          payload && typeof payload === 'object'
            ? (payload as { message?: string | string[] }).message
            : undefined;
        setError(
          (Array.isArray(message) ? message[0] : message) ??
            'No se ha podido usar esa dirección.',
        );
        return;
      }

      onChange(url);
      setLink('');
      setImported(true);
    } catch {
      setError('No se ha podido comprobar la dirección. Revisa tu conexión.');
    } finally {
      setChecking(false);
    }
  }, [link, onChange]);

  const upload = React.useCallback(
    (file: File): void => {
      setError(null);
      if (!ACCEPTED.includes(file.type)) {
        setError('Formato no permitido. Usa JPEG, PNG o WebP.');
        return;
      }
      if (file.size > MAX_SIZE) {
        setError('La imagen supera el máximo de 8 MB.');
        return;
      }

      const body = new FormData();
      body.append('file', file);

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open('POST', UPLOAD_URL);
      xhr.withCredentials = true;
      setProgress(0);

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        setProgress(null);
        xhrRef.current = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const parsed: unknown = JSON.parse(xhr.responseText);
            const url =
              parsed && typeof parsed === 'object'
                ? ((parsed as { data?: { url?: string }; url?: string }).data?.url ??
                  (parsed as { url?: string }).url)
                : undefined;
            if (url) {
              onChange(url);
            } else {
              setError('Respuesta de subida inesperada.');
            }
          } catch {
            setError('No se pudo procesar la respuesta del servidor.');
          }
        } else {
          setError(`No se pudo subir la imagen (${xhr.status}).`);
        }
      });

      xhr.addEventListener('error', () => {
        setProgress(null);
        xhrRef.current = null;
        setError('Error de red al subir la imagen.');
      });

      xhr.send(body);
    },
    [onChange],
  );

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) upload(file);
    // Permite volver a elegir el mismo fichero.
    event.target.value = '';
  };

  const hasImage = Boolean(value);

  return (
    <div className={cn('space-y-2', className)}>
      {label ? <p className="text-sm font-medium text-ink">{label}</p> : null}

      <div
        className={cn(
          'relative w-full overflow-hidden rounded-2xl border border-dashed border-brand-200 bg-surface-subtle/40',
          ASPECT[aspect],
          MAX_W[aspect],
        )}
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl(value)}
            alt="Vista previa"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-ink-soft/60">
            <ImagePlus className="size-8" aria-hidden="true" />
            <span className="text-xs">Sin imagen</span>
          </div>
        )}

        {uploading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/50 backdrop-blur-sm">
            <Loader2 className="size-6 animate-spin text-white" aria-hidden="true" />
            <div className="h-1.5 w-3/4 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-150"
                style={{ width: `${progress ?? 0}%` }}
              />
            </div>
            <span className="text-xs font-medium text-white">{progress ?? 0}%</span>
          </div>
        ) : null}
      </div>

      {/* De dónde viene la foto. Nadie tiene por qué saber qué es una URL: por
          eso el modo por defecto es elegirla del ordenador o del móvil. */}
      <div
        role="tablist"
        aria-label="Origen de la foto"
        className="inline-flex rounded-full border border-brand-100 bg-surface-subtle/60 p-1"
      >
        {(
          [
            { id: 'file', label: 'Subir del dispositivo', icon: UploadCloud },
            { id: 'url', label: 'Desde Internet', icon: Link2 },
          ] as const
        ).map((tab) => {
          const active = source === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={disabled || busy}
              onClick={() => {
                setSource(tab.id);
                setError(null);
                setImported(false);
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
                active ? 'bg-white text-brand-700 shadow-soft' : 'text-ink-soft hover:text-ink',
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {source === 'file' ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            className="sr-only"
            onChange={handleFile}
            disabled={disabled || busy}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            <UploadCloud aria-hidden="true" />
            {hasImage ? 'Cambiar foto' : 'Elegir foto'}
          </Button>
          <span className="text-xs text-ink-soft/70">JPG, PNG o WebP · hasta 8 MB</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="url"
              inputMode="url"
              value={link}
              onChange={(e) => {
                setLink(e.target.value);
                setError(null);
                setImported(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void importFromLink();
                }
              }}
              placeholder="https://…/foto.jpg"
              disabled={disabled || busy}
              className={cn(
                'min-w-0 flex-1 rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm text-ink',
                'placeholder:text-ink-soft/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
                'disabled:opacity-60',
              )}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || busy}
              onClick={() => void importFromLink()}
            >
              {checking ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Check aria-hidden="true" />
              )}
              {checking ? 'Comprobando…' : 'Validar'}
            </Button>
          </div>
          <p className="text-xs text-ink-soft/70">
            Copia la dirección de la imagen (clic derecho sobre la foto → «Copiar dirección de
            imagen»). Se guarda en tu servidor, así no se pierde si la borran de ese sitio.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {hasImage && !busy ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => {
              setError(null);
              setImported(false);
              onChange('');
            }}
          >
            <Trash2 aria-hidden="true" />
            Quitar
          </Button>
        ) : null}
      </div>

      {imported && !error ? (
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
          <Check className="size-3.5" aria-hidden="true" />
          Imagen guardada en tu servidor.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
