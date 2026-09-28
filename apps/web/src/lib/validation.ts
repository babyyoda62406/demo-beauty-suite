import { z } from 'zod';

/**
 * Valor de un campo de imagen del CMS.
 *
 * Acepta las tres formas que produce `ImageUpload`:
 *  - `''`                    → sin foto,
 *  - `/uploads/<fichero>`    → subida o importada, alojada en nuestro servidor,
 *  - `https://…`             → absoluta (contenido antiguo o estático).
 *
 * Existe porque validar estos campos con `z.string().url()` rechaza las rutas
 * relativas: el formulario se quedaba mudo al pulsar Guardar —sin aviso, porque
 * el campo de imagen no pinta errores— y no había forma de saber por qué.
 */
export function imageRef(max = 2048) {
  return z
    .union([
      z.literal(''),
      z
        .string()
        .max(max, `Máximo ${max} caracteres`)
        .refine(
          (v) => v.startsWith('/') || /^https?:\/\//i.test(v),
          'Sube una foto o pega una dirección que empiece por https://',
        ),
    ])
    .optional();
}
