'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarClock,
  IdCard,
  Images,
  Instagram,
  Lock,
  Mail,
  Pencil,
  Phone,
  Sparkles,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from '@/components/ui';
import { ErrorState } from '@/components/common';
import { useClient, useUpdateClient, type ClientInput } from '@/lib/hooks/clients';
import { ClientAvatar } from './client-avatar';
import { ClientFormDialog } from './client-form-dialog';
import { ClientInfo } from './client-info';
import { ClientHistory } from './client-history';
import { ClientPhotos } from './client-photos';
import { ClientNotes } from './client-notes';

/** Cabecera de la ficha durante la carga. */
function DetailSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </Card>
      <Skeleton className="h-11 w-80 rounded-full" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    </div>
  );
}

/**
 * Ficha completa de una clienta con pestañas: Información, Historial, Fotos y
 * Notas privadas. Orquesta la carga de datos y la edición.
 */
export function ClientDetail({ clientId }: { clientId: string }): React.JSX.Element {
  const { toast } = useToast();
  const query = useClient(clientId);
  const updateClient = useUpdateClient();
  const [editOpen, setEditOpen] = React.useState(false);

  if (query.isLoading) return <DetailSkeleton />;

  if (query.isError || !query.data) {
    return (
      <ErrorState
        error={query.error}
        title="No se pudo cargar la ficha"
        onRetry={() => void query.refetch()}
      />
    );
  }

  const client = query.data;

  const handleEdit = async (values: ClientInput): Promise<void> => {
    await updateClient.mutateAsync({ id: client.id, data: values });
    toast({ variant: 'success', title: 'Ficha actualizada', description: client.name });
  };

  return (
    <div className="space-y-6">
      <Link
        href="/salon/clientas"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft/70 transition-colors hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver a clientas
      </Link>

      {/* Cabecera de la ficha */}
      <Card className="relative overflow-hidden p-6">
        <div
          className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-brand-gradient opacity-10 blur-3xl"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <ClientAvatar name={client.name} photoUrl={client.photoUrl} className="size-20" />
            <div className="min-w-0 space-y-1.5">
              <h1 className="truncate font-serif text-2xl font-semibold tracking-tight text-ink">
                {client.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft/80">
                <a
                  href={`tel:${client.phone}`}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-600"
                >
                  <Phone className="size-3.5 text-ink-soft/50" aria-hidden="true" />
                  {client.phone}
                </a>
                {client.email ? (
                  <a
                    href={`mailto:${client.email}`}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-600"
                  >
                    <Mail className="size-3.5 text-ink-soft/50" aria-hidden="true" />
                    {client.email}
                  </a>
                ) : null}
                {client.instagram ? (
                  <a
                    href={`https://instagram.com/${client.instagram.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-600"
                  >
                    <Instagram className="size-3.5 text-ink-soft/50" aria-hidden="true" />
                    {client.instagram}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="solid" className="gap-1.5 px-3 py-1.5 text-sm">
              <Sparkles className="size-3.5" aria-hidden="true" />
              {client.loyaltyPoints} puntos
            </Badge>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil aria-hidden="true" />
              Editar
            </Button>
          </div>
        </div>
      </Card>

      {/* Pestañas */}
      <Tabs defaultValue="info">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="info">
            <IdCard className="mr-1.5 size-4" aria-hidden="true" />
            Información
          </TabsTrigger>
          <TabsTrigger value="history">
            <CalendarClock className="mr-1.5 size-4" aria-hidden="true" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="photos">
            <Images className="mr-1.5 size-4" aria-hidden="true" />
            Fotos
          </TabsTrigger>
          <TabsTrigger value="notes">
            <Lock className="mr-1.5 size-4" aria-hidden="true" />
            Notas privadas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <ClientInfo client={client} />
        </TabsContent>
        <TabsContent value="history">
          <ClientHistory bookings={client.bookings} payments={client.payments} />
        </TabsContent>
        <TabsContent value="photos">
          <ClientPhotos clientId={client.id} photos={client.photos} bookings={client.bookings} />
        </TabsContent>
        <TabsContent value="notes">
          <ClientNotes clientId={client.id} notes={client.notes} />
        </TabsContent>
      </Tabs>

      <ClientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        client={client}
        onSubmit={handleEdit}
      />
    </div>
  );
}
