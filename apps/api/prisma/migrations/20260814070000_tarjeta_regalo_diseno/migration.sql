-- Plantilla con la que se dibuja la tarjeta regalo al compartirla.
-- Las tarjetas ya emitidas se quedan con el diseño de la casa.
ALTER TABLE "GiftCard" ADD COLUMN "design" TEXT NOT NULL DEFAULT 'ciruela';
