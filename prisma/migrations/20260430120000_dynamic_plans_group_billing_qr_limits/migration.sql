DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GroupBillingType') THEN
    CREATE TYPE "GroupBillingType" AS ENUM ('MONTHLY', 'PER_SESSION', 'FULL_COURSE');
  END IF;
END $$;

ALTER TABLE "Group"
  ADD COLUMN IF NOT EXISTS "billingType" "GroupBillingType" NOT NULL DEFAULT 'MONTHLY';

ALTER TABLE "Session"
  ADD COLUMN IF NOT EXISTS "qrScanLimit" INTEGER;

ALTER TABLE "TeacherSubscription"
  ADD COLUMN IF NOT EXISTS "planKey" TEXT;

UPDATE "TeacherSubscription"
SET "planKey" = "subscriptionPlan"::TEXT
WHERE "planKey" IS NULL OR "planKey" = '';

ALTER TABLE "TeacherSubscription"
  ALTER COLUMN "planKey" SET DEFAULT 'STARTER',
  ALTER COLUMN "planKey" SET NOT NULL;

ALTER TABLE "SubscriptionPlanConfig"
  ADD COLUMN IF NOT EXISTS "key" TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

UPDATE "SubscriptionPlanConfig"
SET "key" = "plan"::TEXT
WHERE "key" IS NULL OR "key" = '';

ALTER TABLE "SubscriptionPlanConfig"
  ALTER COLUMN "key" SET NOT NULL;

ALTER TABLE "SubscriptionPlanConfig"
  ALTER COLUMN "plan" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPlanConfig_key_key" ON "SubscriptionPlanConfig"("key");
CREATE INDEX IF NOT EXISTS "SubscriptionPlanConfig_deletedAt_idx" ON "SubscriptionPlanConfig"("deletedAt");

CREATE TABLE IF NOT EXISTS "GroupBillingCharge" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "payerUserId" TEXT NOT NULL,
  "payeeUserId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "billingType" "GroupBillingType" NOT NULL,
  "reason" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "relatedSessionId" TEXT,
  "walletDebitTxId" TEXT,
  "walletCreditTxId" TEXT,
  "coveredSessions" INTEGER,
  "consumedSessions" INTEGER NOT NULL DEFAULT 0,
  "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GroupBillingCharge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GroupBillingCharge_idempotencyKey_key" ON "GroupBillingCharge"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "GroupBillingCharge_tenantId_groupId_studentId_idx" ON "GroupBillingCharge"("tenantId", "groupId", "studentId");
CREATE INDEX IF NOT EXISTS "GroupBillingCharge_tenantId_payerUserId_idx" ON "GroupBillingCharge"("tenantId", "payerUserId");
CREATE INDEX IF NOT EXISTS "GroupBillingCharge_relatedSessionId_idx" ON "GroupBillingCharge"("relatedSessionId");
CREATE INDEX IF NOT EXISTS "GroupBillingCharge_billingType_status_idx" ON "GroupBillingCharge"("billingType", "status");
