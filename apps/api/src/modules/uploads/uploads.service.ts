import { randomUUID } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { writeFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import { join } from 'node:path';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { resolveUploadDir } from './uploads.util';

/** Tamaño máximo de la imagen importada (~8 MB), igual que en la subida directa. */
const MAX_BYTES = 8 * 1024 * 1024;
/** Corta la descarga si el servidor remoto se hace el remolón. */
const TIMEOUT_MS = 10_000;
/** Saltos de redirección permitidos: cada destino se vuelve a validar. */
const MAX_REDIRECTS = 3;

/**
 * Formatos aceptados, reconocidos por su firma binaria y NO por el
 * `Content-Type` que declare el servidor remoto: cualquiera puede servir un
 * ejecutable diciendo que es un `image/png`.
 */
const SIGNATURES: ReadonlyArray<{
  ext: string;
  mime: string;
  matches: (b: Buffer) => boolean;
}> = [
  {
    ext: '.jpg',
    mime: 'image/jpeg',
    matches: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    ext: '.png',
    mime: 'image/png',
    matches: (b) =>
      b.length > 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    ext: '.webp',
    mime: 'image/webp',
    matches: (b) =>
      b.length > 12 && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP',
  },
];

/** Resultado de importar una imagen remota. */
export interface ImportedImage {
  url: string;
  mime: string;
  bytes: number;
}

/**
 * ¿La IP pertenece a un rango que jamás debería alcanzarse desde aquí?
 *
 * Es la defensa contra SSRF: sin esto, pegar `http://127.0.0.1:3001/...` o una
 * IP interna del VPS convertiría al servidor en un ariete contra su propia red
 * privada, y la respuesta se guardaría como si fuera una foto.
 */
function isBlockedAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 0) return true;

  if (version === 6) {
    const lower = ip.toLowerCase();
    // Direcciones IPv4 embebidas (::ffff:10.0.0.1): se juzga la IPv4 real.
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
    if (mapped?.[1]) return isBlockedAddress(mapped[1]);
    if (lower === '::' || lower === '::1') return true;
    const head = lower.split(':')[0] ?? '';
    if (/^f[cd]/.test(head)) return true; // fc00::/7 — únicas locales
    if (/^fe[89ab]/.test(head)) return true; // fe80::/10 — enlace local
    if (lower.startsWith('2001:db8')) return true; // documentación
    return false;
  }

  const parts = ip.split('.').map(Number);
  const [a, b] = parts;
  if (a === undefined || b === undefined || parts.some((n) => !Number.isInteger(n))) return true;

  if (a === 0 || a === 10 || a === 127) return true; // este host, privada, loopback
  if (a === 169 && b === 254) return true; // enlace local (metadatos de nube)
  if (a === 172 && b >= 16 && b <= 31) return true; // privada
  if (a === 192 && b === 168) return true; // privada
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 192 && b === 0) return true; // IETF / TEST-NET-1
  if (a >= 224) return true; // multicast y reservadas
  return false;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  /**
   * Descarga una imagen indicada por URL y la guarda como si se hubiera subido
   * desde el disco, devolviendo la misma URL relativa `/uploads/<fichero>`.
   *
   * La clienta pega un enlace y a partir de ahí la foto vive en nuestro
   * servidor: no dependemos de que el sitio de origen siga publicándola, ni
   * filtramos a terceros quién visita la web.
   */
  async importFromUrl(rawUrl: string): Promise<ImportedImage> {
    let target = await this.assertSafeUrl(rawUrl);

    let response: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      response = await this.fetchOnce(target);
      const location = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && location) {
        target = await this.assertSafeUrl(new URL(location, target).toString());
        continue;
      }
      break;
    }

    if (!response || !response.ok) {
      throw new BadRequestException(
        `El enlace no devuelve una imagen (respondió ${response?.status ?? 'sin respuesta'}).`,
      );
    }

    const buffer = await this.readCapped(response);
    const signature = SIGNATURES.find((s) => s.matches(buffer));
    if (!signature) {
      throw new BadRequestException(
        'El enlace no apunta a una imagen JPEG, PNG o WebP. Comprueba que sea la dirección de la foto y no la de la página.',
      );
    }

    const filename = `${randomUUID()}${signature.ext}`;
    await writeFile(join(resolveUploadDir(), filename), buffer);
    this.logger.log(`Imagen importada desde ${target.host} (${buffer.length} bytes) → ${filename}`);

    return { url: `/uploads/${filename}`, mime: signature.mime, bytes: buffer.length };
  }

  /** Valida esquema y destino real de la URL antes de tocarla. */
  private async assertSafeUrl(raw: string): Promise<URL> {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new BadRequestException('La dirección no es válida. Debe empezar por https://');
    }

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new BadRequestException('Solo se admiten direcciones http:// o https://');
    }

    const host = url.hostname.replace(/^\[|\]$/g, '');
    const addresses = isIP(host)
      ? [{ address: host }]
      : await lookup(host, { all: true }).catch(() => {
          throw new BadRequestException('No se ha podido resolver ese dominio.');
        });

    if (addresses.length === 0 || addresses.some((a) => isBlockedAddress(a.address))) {
      throw new BadRequestException('Esa dirección apunta a una red interna y no se puede usar.');
    }

    return url;
  }

  /** Una petición con tiempo límite y sin seguir redirecciones a ciegas. */
  private async fetchOnce(url: URL): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          // Sin User-Agent hay sitios que responden 403 de entrada (Wikimedia,
          // entre otros): la clienta pegaría un enlace correcto y vería un error.
          'user-agent': 'Mozilla/5.0 (compatible; FGDBeautySuite/1.0; +https://fgds.tech)',
        },
      });
    } catch {
      throw new BadRequestException('No se ha podido descargar la imagen desde ese enlace.');
    } finally {
      clearTimeout(timer);
    }
  }

  /** Lee el cuerpo abortando en cuanto supera el límite (no se fía de Content-Length). */
  private async readCapped(response: Response): Promise<Buffer> {
    const body = response.body;
    if (!body) throw new BadRequestException('El enlace no ha devuelto ningún contenido.');

    const chunks: Buffer[] = [];
    let total = 0;
    const reader = body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        throw new BadRequestException('La imagen supera el máximo de 8 MB.');
      }
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks);
  }
}
