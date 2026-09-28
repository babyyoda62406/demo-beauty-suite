-- Valores de enum nuevos para el aula de la academia (RONDA 3).
-- Van en una migración APARTE porque PostgreSQL no permite usar un valor de
-- enum recién añadido (p. ej. como DEFAULT de una columna) dentro de la misma
-- transacción en que se crea: hay que confirmarlo primero (error 55P04).

-- CreateEnum
CREATE TYPE "EnrollmentPaymentMethod" AS ENUM ('MANUAL', 'STRIPE');

-- CreateEnum
CREATE TYPE "AcademyLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'ENROLLED', 'DISCARDED');

-- AlterEnum
ALTER TYPE "EnrollmentStatus" ADD VALUE 'PENDING_PAYMENT';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'STUDENT';
