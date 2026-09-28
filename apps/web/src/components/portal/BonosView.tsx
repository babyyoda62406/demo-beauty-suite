'use client';

import * as React from 'react';
import { Gift, MessageCircle, Ticket } from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import { EmptyState, ErrorState, PageHeader } from '@/components/common';
import { whatsappLink } from '@/lib/site';
import { useMyGiftCards, useMyVouchers } from '@/lib/hooks/portal';
import { VoucherCard } from './VoucherCard';
import { GiftCardCard } from './GiftCardCard';

const BUY_MESSAGE = 'Hola, me gustaría comprar un bono o una tarjeta regalo ✨';

function CardsSkeleton(): React.JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-44 rounded-2xl" />
      ))}
    </div>
  );
}

/** Sección genérica con título, contador y su estado (carga/error/vacío). */
function Section({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: typeof Ticket;
  count?: number | undefined;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-ink">
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        {title}
        {typeof count === 'number' ? (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
            {count}
          </span>
        ) : null}
      </h2>
      {children}
    </section>
  );
}

/** Vista "Bonos y tarjetas regalo": saldos de la clienta y compra por WhatsApp. */
export function BonosView(): React.JSX.Element {
  const vouchers = useMyVouchers();
  const giftCards = useMyGiftCards();

  const voucherList = vouchers.data ?? [];
  const giftCardList = giftCards.data ?? [];

  const buyButton = (
    <Button asChild>
      <a href={whatsappLink(BUY_MESSAGE)} target="_blank" rel="noopener noreferrer">
        <MessageCircle aria-hidden="true" />
        Comprar
      </a>
    </Button>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Bonos y tarjetas regalo"
        description="Consulta el saldo de tus bonos y tarjetas. Para comprar o usar una, escríbenos y lo gestionamos al instante."
        actions={buyButton}
      />

      <Section title="Mis bonos" icon={Ticket} count={vouchers.data?.length}>
        {vouchers.isPending ? (
          <CardsSkeleton />
        ) : vouchers.isError ? (
          <ErrorState error={vouchers.error} onRetry={() => void vouchers.refetch()} />
        ) : voucherList.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="Todavía no tienes bonos"
            description="Los bonos te permiten prepagar varias sesiones con descuento. Escríbenos para adquirir el tuyo."
            action={buyButton}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {voucherList.map((voucher) => (
              <VoucherCard key={voucher.id} voucher={voucher} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Mis tarjetas regalo" icon={Gift} count={giftCards.data?.length}>
        {giftCards.isPending ? (
          <CardsSkeleton />
        ) : giftCards.isError ? (
          <ErrorState error={giftCards.error} onRetry={() => void giftCards.refetch()} />
        ) : giftCardList.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="No tienes tarjetas regalo"
            description="Regala belleza o pide la tuya: una tarjeta regalo se puede usar en cualquier servicio."
            action={buyButton}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {giftCardList.map((giftCard) => (
              <GiftCardCard key={giftCard.id} giftCard={giftCard} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
