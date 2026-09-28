import * as React from 'react';
import { Banknote, FileText, LockKeyhole, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/common';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { CajaKpis, CobrosTab, GastosTab, CierreTab, FacturasTab } from '@/components/caja';

/**
 * Caja del salón (SPEC §6): cobros, gastos, cierre de caja y facturas/tickets,
 * con los KPIs del día siempre visibles arriba.
 */
export default function CajaPage(): React.JSX.Element {
  return (
    <div>
      <PageHeader
        title="Caja"
        description="Cobros, gastos y cierre de caja del salón."
        icon={<Banknote className="size-7" aria-hidden="true" />}
      />

      <CajaKpis />

      <Tabs defaultValue="cobros">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="cobros" className="gap-1.5">
            <Banknote className="size-4" aria-hidden="true" />
            Cobros
          </TabsTrigger>
          <TabsTrigger value="gastos" className="gap-1.5">
            <Wallet className="size-4" aria-hidden="true" />
            Gastos
          </TabsTrigger>
          <TabsTrigger value="cierre" className="gap-1.5">
            <LockKeyhole className="size-4" aria-hidden="true" />
            Cierre de caja
          </TabsTrigger>
          <TabsTrigger value="facturas" className="gap-1.5">
            <FileText className="size-4" aria-hidden="true" />
            Facturas/Tickets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cobros">
          <CobrosTab />
        </TabsContent>
        <TabsContent value="gastos">
          <GastosTab />
        </TabsContent>
        <TabsContent value="cierre">
          <CierreTab />
        </TabsContent>
        <TabsContent value="facturas">
          <FacturasTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
