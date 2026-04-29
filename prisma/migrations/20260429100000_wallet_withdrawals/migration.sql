DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WalletWithdrawalMethod') THEN
    CREATE TYPE "WalletWithdrawalMethod" AS ENUM ('KASHIER');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WalletWithdrawalStatus') THEN
    CREATE TYPE "WalletWithdrawalStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "WalletWithdrawal" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "method" "WalletWithdrawalMethod" NOT NULL DEFAULT 'KASHIER',
  "status" "WalletWithdrawalStatus" NOT NULL DEFAULT 'PENDING',
  "failureReason" TEXT,
  "transactionId" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WalletWithdrawal_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WalletTransaction"
  ADD COLUMN IF NOT EXISTS "relatedWithdrawalId" TEXT;

CREATE INDEX IF NOT EXISTS "WalletWithdrawal_tenantId_userId_idx" ON "WalletWithdrawal"("tenantId", "userId");
CREATE INDEX IF NOT EXISTS "WalletWithdrawal_tenantId_status_idx" ON "WalletWithdrawal"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "WalletWithdrawal_walletId_requestedAt_idx" ON "WalletWithdrawal"("walletId", "requestedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "WalletTransaction_relatedWithdrawalId_type_userId_key" ON "WalletTransaction"("relatedWithdrawalId", "type", "userId");

ALTER TABLE "WalletWithdrawal"
  ADD CONSTRAINT "WalletWithdrawal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WalletWithdrawal"
  ADD CONSTRAINT "WalletWithdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WalletWithdrawal"
  ADD CONSTRAINT "WalletWithdrawal_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "UserWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WalletTransaction"
  ADD CONSTRAINT "WalletTransaction_relatedWithdrawalId_fkey" FOREIGN KEY ("relatedWithdrawalId") REFERENCES "WalletWithdrawal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
