import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Resolución (memoizada) del directorio de subidas.
 *
 * En producción `UPLOAD_DIR` es un volumen montado (p. ej. `/app/uploads`). En
 * local ese path puede no existir ni ser escribible, así que si no se puede
 * crear se cae a `<cwd>/uploads`. El directorio se crea al primer uso (y también
 * en el arranque del módulo), de modo que `diskStorage` y `res.sendFile` operan
 * siempre sobre una ruta absoluta y garantizada.
 */
let resolvedDir: string | null = null;

/** Intenta crear (recursivo) el directorio; devuelve la ruta si lo consigue. */
function ensureWritableDir(dir: string): string | null {
  try {
    mkdirSync(dir, { recursive: true });
    return dir;
  } catch {
    return null;
  }
}

/**
 * Devuelve la ruta absoluta del directorio de subidas, creándolo si hace falta.
 * `configured` viene de la configuración (`UPLOAD_DIR`); si se omite se lee de
 * `process.env.UPLOAD_DIR` (necesario en el `diskStorage`, evaluado al definir la
 * clase). El resultado se memoiza para que todas las rutas usen el mismo dir.
 */
export function resolveUploadDir(configured?: string): string {
  if (resolvedDir) {
    return resolvedDir;
  }
  const candidate = configured ?? process.env.UPLOAD_DIR ?? '/app/uploads';
  const fallback = join(process.cwd(), 'uploads');
  resolvedDir = ensureWritableDir(candidate) ?? ensureWritableDir(fallback) ?? fallback;
  return resolvedDir;
}
