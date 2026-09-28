-- Foto de perfil de la cuenta: la usa «Mi perfil» del panel y el avatar de la cabecera.
ALTER TABLE "User" ADD COLUMN "photoUrl" TEXT;

-- Token del enlace público del ticket. Se genera al emitir la factura y permite
-- que la clienta lo abra desde el enlace que recibe por WhatsApp, sin sesión y
-- sin exponer el identificador interno.
ALTER TABLE "Invoice" ADD COLUMN "publicToken" TEXT;
CREATE UNIQUE INDEX "Invoice_publicToken_key" ON "Invoice"("publicToken");
