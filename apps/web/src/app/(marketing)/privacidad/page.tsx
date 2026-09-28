import * as React from 'react';
import type { Metadata } from 'next';
import { site } from '@/lib/site';
import { LegalDoc, type LegalSection } from '@/components/reserva/legal-doc';

export const metadata: Metadata = {
  title: 'Política de privacidad · Estudio Aurora',
  description:
    'Información sobre el tratamiento de datos personales y los derechos de las personas usuarias en Estudio Aurora.',
};

const sections: LegalSection[] = [
  {
    heading: 'Responsable del tratamiento',
    body: [
      'El responsable del tratamiento de los datos personales recabados a través de este sitio web es:',
      [
        `Responsable: ${site.legalName}`,
        'NIF/CIF: [pendiente de completar]',
        `Domicilio: ${site.address}`,
        `Correo electrónico: ${site.email}`,
        `Teléfono: ${site.phoneDisplay}`,
      ],
    ],
  },
  {
    heading: 'Datos que recopilamos',
    body: [
      'A través del formulario de reserva y de los canales de contacto podemos tratar las siguientes categorías de datos:',
      [
        'Datos identificativos y de contacto: nombre, teléfono y, opcionalmente, correo electrónico.',
        'Datos de la reserva: servicio solicitado, profesional, fecha y hora, y notas o preferencias que nos facilites.',
        'Datos de navegación técnicos necesarios para el funcionamiento del sitio.',
      ],
    ],
  },
  {
    heading: 'Finalidad del tratamiento',
    body: [
      'Tratamos tus datos con las siguientes finalidades:',
      [
        'Gestionar y confirmar las reservas de cita solicitadas.',
        'Ponernos en contacto contigo para asuntos relacionados con tu cita.',
        'Atender tus consultas y solicitudes.',
        'Cumplir con las obligaciones legales que resulten aplicables.',
      ],
    ],
  },
  {
    heading: 'Legitimación',
    body: [
      'La base legal para el tratamiento de tus datos es tu consentimiento, otorgado al aceptar esta política y enviar el formulario de reserva, así como la ejecución de la relación de prestación de servicios y el cumplimiento de obligaciones legales.',
    ],
  },
  {
    heading: 'Conservación de los datos',
    body: [
      'Conservaremos tus datos durante el tiempo necesario para la gestión de la cita y de la relación con el salón, y posteriormente durante los plazos legalmente exigidos para atender posibles responsabilidades. Cuando dejen de ser necesarios, se suprimirán de forma segura.',
    ],
  },
  {
    heading: 'Destinatarios',
    body: [
      'Tus datos no se cederán a terceros salvo obligación legal. Podrán acceder a ellos los proveedores tecnológicos que prestan servicios de alojamiento y gestión al salón, actuando como encargados del tratamiento y bajo las debidas garantías de confidencialidad.',
    ],
  },
  {
    heading: 'Tus derechos',
    body: [
      'Puedes ejercer en cualquier momento los siguientes derechos dirigiéndote a nuestro correo electrónico:',
      [
        'Acceso a tus datos personales.',
        'Rectificación de los datos inexactos.',
        'Supresión de los datos cuando ya no sean necesarios.',
        'Limitación u oposición al tratamiento.',
        'Portabilidad de los datos.',
        'Retirar el consentimiento prestado, sin que ello afecte a la licitud del tratamiento previo.',
      ],
      `Para ejercerlos, escríbenos a ${site.email}. Si consideras que no hemos atendido correctamente tu solicitud, puedes presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).`,
    ],
  },
  {
    heading: 'Cookies',
    body: [
      'Este sitio web utiliza únicamente las cookies técnicas estrictamente necesarias para su funcionamiento. En caso de incorporar cookies analíticas o de terceros, se solicitará tu consentimiento previo mediante el correspondiente aviso.',
    ],
  },
];

/** Política de privacidad (SPEC §9 — superficies de marketing/legal). */
export default function PrivacidadPage(): React.JSX.Element {
  return (
    <LegalDoc
      eyebrow="Protección de datos"
      title="Política de privacidad"
      updatedAt="1 de agosto de 2026"
      intro="Tu privacidad nos importa. Aquí te explicamos qué datos tratamos, con qué finalidad y cómo puedes ejercer tus derechos."
      sections={sections}
    />
  );
}
