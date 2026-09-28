-- Aula gated de la academia (RONDA 3): la matrícula nace SIN pagar y el pago
-- se registra en la propia matrícula; `AcademyLead` es el CRM de interesadas.
-- Depende de la migración anterior, que confirma los valores de enum nuevos.

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "amountPaid" INTEGER,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paidByUserId" TEXT,
ADD COLUMN     "paymentMethod" "EnrollmentPaymentMethod",
ADD COLUMN     "paymentRef" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT';

-- Las matrículas que ya existían se dan por pagadas: se crearon cuando el
-- acceso no requería pago, y degradarlas retiraría un acceso ya concedido.
UPDATE "Enrollment"
SET "paidAt" = "createdAt", "paymentMethod" = 'MANUAL',
    "paymentRef" = 'Matrícula anterior al control de pago (RONDA 3)'
WHERE "status" IN ('ACTIVE', 'COMPLETED') AND "paidAt" IS NULL;

-- CreateTable
CREATE TABLE "AcademyLead" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "status" "AcademyLeadStatus" NOT NULL DEFAULT 'NEW',
    "source" TEXT NOT NULL DEFAULT 'info',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcademyLead_tenantId_status_idx" ON "AcademyLead"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AcademyLead_tenantId_createdAt_idx" ON "AcademyLead"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyLead_tenantId_email_key" ON "AcademyLead"("tenantId", "email");

-- AddForeignKey
ALTER TABLE "AcademyLead" ADD CONSTRAINT "AcademyLead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyLead" ADD CONSTRAINT "AcademyLead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
