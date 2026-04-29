DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'ADMIN'
      AND enumtypid = '"WalletWithdrawalMethod"'::regtype
  ) THEN
    ALTER TYPE "WalletWithdrawalMethod" ADD VALUE 'ADMIN';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WalletWithdrawalAdminMethod') THEN
    CREATE TYPE "WalletWithdrawalAdminMethod" AS ENUM (
      'CASH',
      'ELECTRONIC_WALLET',
      'INSTAPAY',
      'BANK_TRANSFER',
      'OTHER'
    );
  END IF;
END $$;

ALTER TABLE "WalletWithdrawal"
  ADD COLUMN IF NOT EXISTS "adminMethod" "WalletWithdrawalAdminMethod",
  ADD COLUMN IF NOT EXISTS "processedById" TEXT;

CREATE INDEX IF NOT EXISTS "WalletWithdrawal_tenantId_method_idx" ON "WalletWithdrawal"("tenantId", "method");
CREATE INDEX IF NOT EXISTS "WalletWithdrawal_tenantId_adminMethod_idx" ON "WalletWithdrawal"("tenantId", "adminMethod");
CREATE INDEX IF NOT EXISTS "WalletWithdrawal_processedById_idx" ON "WalletWithdrawal"("processedById");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'WalletWithdrawal_processedById_fkey'
  ) THEN
    ALTER TABLE "WalletWithdrawal"
      ADD CONSTRAINT "WalletWithdrawal_processedById_fkey"
      FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
