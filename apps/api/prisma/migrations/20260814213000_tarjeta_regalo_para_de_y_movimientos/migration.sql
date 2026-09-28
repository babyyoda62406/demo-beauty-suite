-- Tarjetas regalo: a quién van dirigidas, si regalan un servicio, el enlace
-- secreto y el historial de movimientos.

-- 1. Campos nuevos, todos opcionales salvo el token, que se trata aparte.
ALTER TABLE "GiftCard" ADD COLUMN "recipientName" TEXT;
ALTER TABLE "GiftCard" ADD COLUMN "senderName" TEXT;
ALTER TABLE "GiftCard" ADD COLUMN "serviceId" TEXT;

-- 2. El secreto del enlace público. Se añade permitiendo nulos para poder
--    rellenar las tarjetas que ya existen antes de exigirlo.
ALTER TABLE "GiftCard" ADD COLUMN "publicToken" TEXT;

UPDATE "GiftCard"
SET "publicToken" = md5(random()::text || clock_timestamp()::text || id)
                 || md5(random()::text || clock_timestamp()::text || id)
WHERE "publicToken" IS NULL;

ALTER TABLE "GiftCard" ALTER COLUMN "publicToken" SET NOT NULL;
CREATE UNIQUE INDEX "GiftCard_publicToken_key" ON "GiftCard"("publicToken");

-- 3. Relación con el servicio regalado. SET NULL: si se borra un servicio del
--    catálogo la tarjeta sigue valiendo por su importe.
ALTER TABLE "GiftCard"
  ADD CONSTRAINT "GiftCard_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Historial de movimientos de saldo.
CREATE TABLE "GiftCardTransaction" (
  "id"         TEXT NOT NULL,
  "tenantId"   TEXT NOT NULL,
  "giftCardId" TEXT NOT NULL,
  "amount"     INTEGER NOT NULL,
  "balance"    INTEGER NOT NULL,
  "reason"     TEXT,
  "clientId"   TEXT,
  "userId"     TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GiftCardTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GiftCardTransaction_giftCardId_createdAt_idx"
  ON "GiftCardTransaction"("giftCardId", "createdAt");
CREATE INDEX "GiftCardTransaction_tenantId_createdAt_idx"
  ON "GiftCardTransaction"("tenantId", "createdAt");

ALTER TABLE "GiftCardTransaction"
  ADD CONSTRAINT "GiftCardTransaction_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GiftCardTransaction"
  ADD CONSTRAINT "GiftCardTransaction_giftCardId_fkey"
  FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
