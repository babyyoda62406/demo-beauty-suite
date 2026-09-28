'use client';

import * as React from 'react';
import { Palette, Store } from 'lucide-react';
import { PageHeader, ErrorState } from '@/components/common';
import {
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { useTenant, useTenantSettings } from '@/lib/hooks/tenant';
import { BrandingForm } from './BrandingForm';
import { BusinessForm } from './BusinessForm';

type TabKey = 'branding' | 'negocio' | 'modulos';

/**
 * Vista de Ajustes del salón (marca blanca): branding con previsualización en
 * vivo, datos del negocio y activación de módulos. Orquesta carga/error y las
 * tres superficies. Es Client Component porque todo aquí es interactivo.
 */
export function AjustesView(): React.JSX.Element {
  const [tab, setTab] = React.useState<TabKey>('branding');
  const tenantQuery = useTenant();
  const settingsQuery = useTenantSettings();

  const isLoading = tenantQuery.isLoading || settingsQuery.isLoading;
  const error = tenantQuery.error ?? settingsQuery.error;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ajustes del salón"
        description="Personaliza tu marca, gestiona los datos del negocio y activa los módulos que necesitas."
        icon={<Palette className="size-6" aria-hidden="true" />}
      />

      {error && !tenantQuery.data ? (
        <ErrorState
          error={error}
          onRetry={() => {
            void tenantQuery.refetch();
            void settingsQuery.refetch();
          }}
        />
      ) : isLoading || !tenantQuery.data ? (
        <LoadingState />
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList>
            <TabsTrigger value="branding">
              <Palette className="size-4" aria-hidden="true" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="negocio">
              <Store className="size-4" aria-hidden="true" />
              Datos del negocio
            </TabsTrigger>
            {/* La pestaña de Módulos queda oculta a propósito: sus 10
                interruptores se guardan pero NO los lee nadie —ni la API ni el
                menú—, así que apagar un módulo no apagaba nada. Enseñar un
                mando que no responde es peor que no enseñarlo. Vuelve el día
                que se implemente el guard en la API y el menú condicional. */}
          </TabsList>

          <TabsContent value="branding">
            <BrandingForm tenant={tenantQuery.data} />
          </TabsContent>
          <TabsContent value="negocio">
            <BusinessForm tenant={tenantQuery.data} settings={settingsQuery.data} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function LoadingState(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <Skeleton className="h-11 w-80 rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,26rem)]">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
