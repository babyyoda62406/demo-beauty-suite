import * as React from 'react';
import type { Metadata } from 'next';
import { site } from '@/lib/site';
import { LegalDoc, type LegalSection } from '@/components/reserva/legal-doc';

export const metadata: Metadata = {
  title: 'Aviso legal · Estudio Aurora',
  description: 'Aviso legal y condiciones de uso del sitio web de Estudio Aurora.',
};

const sections: LegalSection[] = [
  {
    heading: 'Titular del sitio web',
    body: [
      'En cumplimiento de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se facilitan los siguientes datos identificativos del titular:',
      [
        `Denominación: ${site.legalName}`,
        'NIF/CIF: [pendiente de completar]',
        `Domicilio: ${site.address}`,
        `Correo electrónico: ${site.email}`,
        `Teléfono: ${site.phoneDisplay}`,
      ],
    ],
  },
  {
    heading: 'Objeto',
    body: [
      'El presente aviso legal regula el uso del sitio web, que el titular pone a disposición de las personas usuarias con el fin de dar a conocer sus servicios de estética y belleza y facilitar la reserva de citas.',
      'La navegación por el sitio web atribuye la condición de usuario e implica la aceptación plena de todas las cláusulas de este aviso legal.',
    ],
  },
  {
    heading: 'Condiciones de uso',
    body: [
      'La persona usuaria se compromete a hacer un uso adecuado de los contenidos y servicios del sitio web y a no emplearlos para:',
      [
        'Realizar actividades ilícitas, ilegales o contrarias a la buena fe y al orden público.',
        'Introducir o difundir contenidos o programas maliciosos (virus, malware) que puedan dañar los sistemas.',
        'Intentar acceder de forma no autorizada a secciones restringidas o a datos de terceros.',
      ],
    ],
  },
  {
    heading: 'Reservas de cita',
    body: [
      'Las reservas realizadas a través del sitio web constituyen una solicitud de cita que queda pendiente de confirmación por parte del salón. La disponibilidad mostrada es orientativa y puede variar hasta la confirmación definitiva.',
      'La persona usuaria es responsable de la veracidad de los datos de contacto facilitados para la gestión de la reserva.',
    ],
  },
  {
    heading: 'Reservas, puntualidad y cancelaciones',
    body: [
      'Para agilizar tu cita, ten en cuenta las siguientes condiciones del salón:',
      [
        'Reservas: se realizan con cita previa por WhatsApp, indicando el servicio que deseas, el largo y, si hace falta, una foto del diseño de referencia.',
        'Puntualidad: un retraso superior a 15 minutos puede obligar a modificar o reprogramar el servicio para no afectar a las siguientes citas.',
        'Cancelaciones: si no puedes acudir, avísanos con al menos 24 horas de antelación para poder reorganizar la agenda.',
        'Precios: pueden variar según el largo, el estado de las uñas o el trabajo necesario. Retirada de acrílico de otro profesional: 10 €. Retirada de semipermanente de otro centro: 5 €. Los diseños normales están incluidos; los diseños 3D se cobran aparte.',
      ],
    ],
  },
  {
    heading: 'Propiedad intelectual e industrial',
    body: [
      'Todos los contenidos del sitio web (textos, fotografías, gráficos, imágenes, marca, logotipos y diseño) son titularidad del titular o de terceros que han autorizado su uso, y están protegidos por la normativa de propiedad intelectual e industrial.',
      'Queda prohibida su reproducción, distribución o transformación sin la autorización expresa de su titular.',
    ],
  },
  {
    heading: 'Exclusión de responsabilidad',
    body: [
      'El titular no se hace responsable de los daños o perjuicios derivados de interrupciones, virus informáticos, averías o desconexiones en el funcionamiento del sistema ajenas a su control.',
      'El sitio web puede contener enlaces a páginas de terceros sobre cuyos contenidos el titular no ejerce control alguno.',
    ],
  },
  {
    heading: 'Legislación aplicable y jurisdicción',
    body: [
      'El presente aviso legal se rige por la legislación española. Para la resolución de cualquier controversia, las partes se someten a los juzgados y tribunales del domicilio del titular, salvo que la normativa de consumo aplicable establezca otro fuero.',
    ],
  },
];

/** Aviso legal (SPEC §9 — superficies de marketing/legal). */
export default function LegalPage(): React.JSX.Element {
  return (
    <LegalDoc
      eyebrow="Información legal"
      title="Aviso legal"
      updatedAt="1 de agosto de 2026"
      intro="El acceso y uso de este sitio web están sujetos a las condiciones que se detallan a continuación. Te recomendamos leerlas con atención."
      sections={sections}
    />
  );
}
