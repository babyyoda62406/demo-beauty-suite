'use client';

import * as React from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui';

/**
 * Lector de códigos QR con la cámara del móvil.
 *
 * Usa `BarcodeDetector`, que traen Chrome y el navegador de Android sin
 * necesidad de librería. Donde no exista —Safari, sobre todo— el botón ni
 * siquiera aparece y se teclea el código a mano, que es la vía que siempre
 * funciona.
 */

interface CodigoDetectado {
  rawValue: string;
}
interface DetectorDeCodigos {
  detect: (fuente: CanvasImageSource) => Promise<CodigoDetectado[]>;
}
type ConstructorDetector = new (opciones?: { formats?: string[] }) => DetectorDeCodigos;

function obtenerDetector(): ConstructorDetector | null {
  const g = globalThis as unknown as { BarcodeDetector?: ConstructorDetector };
  return g.BarcodeDetector ?? null;
}

/** `true` si este navegador puede leer QR con la cámara. */
export function hayLectorDeQr(): boolean {
  return obtenerDetector() !== null && typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices);
}

/**
 * Saca el código de lo que devuelva el QR.
 *
 * El QR de la tarjeta lleva la URL pública (`…/regalo/GC-XXXX`), pero también
 * se acepta el código pelado por si alguien genera el suyo.
 */
export function codigoDesdeQr(texto: string): string {
  const limpio = texto.trim();
  const enUrl = /\/regalo\/([A-Za-z0-9-]+)/.exec(limpio);
  if (enUrl) return enUrl[1]!.toUpperCase();
  return limpio.toUpperCase();
}

export function EscanearQr({
  onLeido,
  onCerrar,
}: {
  onLeido: (codigo: string) => void;
  onCerrar: () => void;
}): React.JSX.Element {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [listo, setListo] = React.useState(false);

  React.useEffect(() => {
    const Detector = obtenerDetector();
    if (!Detector) {
      setError('Este navegador no puede leer códigos con la cámara.');
      return;
    }

    let stream: MediaStream | null = null;
    let animacion = 0;
    let cancelado = false;
    const detector = new Detector({ formats: ['qr_code'] });

    const mirar = async (): Promise<void> => {
      const video = videoRef.current;
      if (cancelado || !video || video.readyState < 2) {
        animacion = requestAnimationFrame(() => void mirar());
        return;
      }
      try {
        const codigos = await detector.detect(video);
        const primero = codigos[0];
        if (primero) {
          onLeido(codigoDesdeQr(primero.rawValue));
          return;
        }
      } catch {
        // un fotograma ilegible no es un fallo: se sigue mirando
      }
      animacion = requestAnimationFrame(() => void mirar());
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        if (cancelado) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
        }
        setListo(true);
        animacion = requestAnimationFrame(() => void mirar());
      })
      .catch(() => setError('No se ha podido abrir la cámara. Revisa los permisos del navegador.'));

    return () => {
      cancelado = true;
      cancelAnimationFrame(animacion);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onLeido]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4">
      <div className="flex items-center justify-between text-white">
        <p className="text-sm font-medium">Apunta al código de la tarjeta</p>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="rounded-full p-2 hover:bg-white/10"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center">
        {error ? (
          <div className="max-w-sm text-center text-white">
            <p className="text-sm">{error}</p>
            <Button className="mt-4" variant="outline" onClick={onCerrar}>
              Escribir el código a mano
            </Button>
          </div>
        ) : (
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} playsInline muted className="w-full" />
            {!listo ? (
              <div className="absolute inset-0 grid place-items-center text-white">
                <Loader2 className="size-8 animate-spin" aria-hidden="true" />
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-white/70" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Botón que abre la cámara, solo si este navegador sabe leer QR. */
export function BotonEscanear({ onAbrir }: { onAbrir: () => void }): React.JSX.Element | null {
  const [disponible, setDisponible] = React.useState(false);
  // En el servidor no hay cámara ni detector: se decide ya en el navegador.
  React.useEffect(() => setDisponible(hayLectorDeQr()), []);
  if (!disponible) return null;
  return (
    <Button variant="outline" onClick={onAbrir}>
      <Camera aria-hidden="true" />
      Escanear
    </Button>
  );
}
