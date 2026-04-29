DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WalletTransactionType') THEN
    CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT', 'ADMIN_ADJUSTMENT', 'PAYOUT');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "UserWallet" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserWallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WalletTransaction" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "WalletTransactionType" NOT NULL,
  "amount" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
  "relatedPaymentId" TEXT,
  "relatedTransferId" TEXT,
  "createdById" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserWallet_tenantId_userId_key" ON "UserWallet"("tenantId", "userId");

INSERT INTO "UserWallet" ("id", "tenantId", "userId", "balance", "createdAt", "updatedAt")
SELECT 'uw_' || sb."id", sb."tenantId", sb."studentId", sb."balance", sb."createdAt", sb."updatedAt"
FROM "StudentBalance" sb
ON CONFLICT ("tenantId", "userId") DO UPDATE
SET "balance" = EXCLUDED."balance",
    "updatedAt" = EXCLUDED."updatedAt";

CREATE INDEX IF NOT EXISTS "UserWallet_tenantId_userId_idx" ON "UserWallet"("tenantId", "userId");
CREATE INDEX IF NOT EXISTS "UserWallet_tenantId_balance_idx" ON "UserWallet"("tenantId", "balance");

CREATE INDEX IF NOT EXISTS "WalletTransaction_tenantId_userId_idx" ON "WalletTransaction"("tenantId", "userId");
CREATE INDEX IF NOT EXISTS "WalletTransaction_tenantId_walletId_idx" ON "WalletTransaction"("tenantId", "walletId");
CREATE INDEX IF NOT EXISTS "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt");
CREATE INDEX IF NOT EXISTS "WalletTransaction_status_createdAt_idx" ON "WalletTransaction"("status", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "WalletTransaction_relatedPaymentId_type_userId_key" ON "WalletTransaction"("relatedPaymentId", "type", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "WalletTransaction_relatedTransferId_type_userId_key" ON "WalletTransaction"("relatedTransferId", "type", "userId");

ALTER TABLE "UserWallet"
  ADD CONSTRAINT "UserWallet_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserWallet"
  ADD CONSTRAINT "UserWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WalletTransaction"
  ADD CONSTRAINT "WalletTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WalletTransaction"
  ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "UserWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WalletTransaction"
  ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WalletTransaction"
  ADD CONSTRAINT "WalletTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WalletTransaction"
  ADD CONSTRAINT "WalletTransaction_relatedPaymentId_fkey" FOREIGN KEY ("relatedPaymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WalletTransaction"
  ADD CONSTRAINT "WalletTransaction_relatedTransferId_fkey" FOREIGN KEY ("relatedTransferId") REFERENCES "TeacherTransfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
