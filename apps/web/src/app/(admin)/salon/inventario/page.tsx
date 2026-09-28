'use client';

import * as React from 'react';
import { Boxes, Truck } from 'lucide-react';
import { PageHeader } from '@/components/common';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { ProductsTab, SuppliersTab, LowStockBanner } from '@/components/inventario';

/**
 * Inventario del salón: Productos (alta/edición, ajuste de stock),
 * Proveedores (CRUD) y aviso destacado de stock bajo.
 */
export default function InventarioPage(): React.JSX.Element {
  const [tab, setTab] = React.useState<'productos' | 'proveedores'>('productos');
  const [focusProductId, setFocusProductId] = React.useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario"
        description="Controla productos, proveedores y niveles de stock del salón."
        icon={<Boxes className="size-6" aria-hidden="true" />}
      />

      <LowStockBanner
        onViewProduct={(productId) => {
          setTab('productos');
          setFocusProductId(productId);
        }}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'productos' | 'proveedores')}>
        <TabsList>
          <TabsTrigger value="productos">
            <Boxes className="size-4" aria-hidden="true" />
            Productos
          </TabsTrigger>
          <TabsTrigger value="proveedores">
            <Truck className="size-4" aria-hidden="true" />
            Proveedores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="productos">
          <ProductsTab focusProductId={focusProductId} />
        </TabsContent>
        <TabsContent value="proveedores">
          <SuppliersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
