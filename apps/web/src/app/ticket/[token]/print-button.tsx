'use client';

import * as React from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@fgd/ui';

/**
 * Imprimir / guardar como PDF.
 *
 * El diálogo del navegador ya ofrece «Guardar como PDF» en escritorio y móvil,
 * así que no hace falta generar el fichero en el servidor.
 */
export function PrintButton(): React.JSX.Element {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      <Printer />
      Imprimir o guardar en PDF
    </Button>
  );
}
