-- Financial hardening migration
-- 1) Convert historical money values from qirsh-like scale to EGP integer (divide by 100)
UPDATE "Payment" SET "amount" = FLOOR("amount" / 100.0) WHERE "amount" >= 1000;
UPDATE "TeacherSubscription" SET "amount" = FLOOR("amount" / 100.0) WHERE "amount" >= 1000;
UPDATE "StudentBalance" SET "balance" = FLOOR("balance" / 100.0) WHERE "balance" >= 1000;
UPDATE "BalanceTransaction" SET "amount" = FLOOR("amount" / 100.0) WHERE "amount" >= 1000;
UPDATE "TeacherTransfer" SET "amount" = FLOOR("amount" / 100.0) WHERE "amount" >= 1000;
UPDATE "TeacherTransfer" SET "fee" = FLOOR("fee" / 100.0) WHERE "fee" >= 1000;

-- 2) Add new enums
DO $$ BEGIN
  CREATE TYPE "FinancialEventType" AS ENUM (
    'PAYMENT_CREATED',
    'PAYMENT_CONFIRMED',
    'PAYMENT_FAILED',
    'BALANCE_CREDIT',
    'BALANCE_DEBIT',
    'TRANSFER_ENQUEUED',
    'TRANSFER_SUCCESS',
    'TRANSFER_FAILED',
    'SUBSCRIPTION_UPDATED'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "FinancialEntityType" AS ENUM (
    'PAYMENT',
    'BALANCE',
    'BALANCE_TRANSACTION',
    'TRANSFER',
    'SUBSCRIPTION'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3) Create audit table
CREATE TABLE IF NOT EXISTS "FinancialAuditLog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "actorId" TEXT,
  "eventType" "FinancialEventType" NOT NULL,
  "entityType" "FinancialEntityType" NOT NULL,
  "entityId" TEXT,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FinancialAuditLog_tenantId_createdAt_idx" ON "FinancialAuditLog"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "FinancialAuditLog_tenantId_eventType_idx" ON "FinancialAuditLog"("tenantId", "eventType");

DO $$ BEGIN
  ALTER TABLE "FinancialAuditLog"
  ADD CONSTRAINT "FinancialAuditLog_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 4) Add Payment <-> BalanceTransaction FK relation and transfer uniqueness
DO $$ BEGIN
  ALTER TABLE "BalanceTransaction"
  ADD CONSTRAINT "BalanceTransaction_relatedPaymentId_fkey"
  FOREIGN KEY ("relatedPaymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "TeacherTransfer_paymentId_key" ON "TeacherTransfer"("paymentId");

