'use client';

import * as React from 'react';
import { PackageSearch, ShoppingBag, Store } from 'lucide-react';
import { PageHeader } from '@/components/common';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { OrdersTab, StoreProductsTab } from '@/components/tienda';

/**
 * Tienda del salón: Pedidos (estado y transiciones) y Productos de tienda
 * (`Product` con `isStoreItem: true`) de la tienda online (SPEC §7).
 */
export default function TiendaPage(): React.JSX.Element {
  const [tab, setTab] = React.useState<'pedidos' | 'productos'>('pedidos');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tienda"
        description="Gestiona los pedidos de la tienda online y el catálogo de productos visibles para las clientas."
        icon={<Store className="size-6" aria-hidden="true" />}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'pedidos' | 'productos')}>
        <TabsList>
          <TabsTrigger value="pedidos">
            <PackageSearch className="size-4" aria-hidden="true" />
            Pedidos
          </TabsTrigger>
          <TabsTrigger value="productos">
            <ShoppingBag className="size-4" aria-hidden="true" />
            Productos de tienda
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos">
          <OrdersTab />
        </TabsContent>
        <TabsContent value="productos">
          <StoreProductsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
