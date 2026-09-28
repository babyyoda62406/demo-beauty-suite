import * as React from 'react';
import type { Metadata } from 'next';
import { StatsView } from '@/components/stats';

export const metadata: Metadata = {
  title: 'Estadísticas',
  description: 'Panel de estadísticas del salón: facturación, servicios, horas pico y cancelaciones.',
};

/**
 * Estadísticas del salón (SPEC §7 `stats`). La orquestación es cliente
 * (`StatsView`): mantiene el rango de fechas y las gráficas recharts. Los KPIs
 * y cada gráfica gestionan su propio estado de carga, vacío y error.
 */
export default function EstadisticasPage(): React.JSX.Element {
  return <StatsView />;
}
