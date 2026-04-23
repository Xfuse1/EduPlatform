CREATE TABLE IF NOT EXISTS "SubscriptionPlanConfig" (
    "id" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyPrice" INTEGER NOT NULL,
    "yearlyPrice" INTEGER NOT NULL,
    "studentsLimit" INTEGER NOT NULL,
    "groupsLimit" INTEGER NOT NULL,
    "sessionsLimit" INTEGER NOT NULL,
    "storageLimit" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SubscriptionPlanConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPlanConfig_plan_key" ON "SubscriptionPlanConfig"("plan");
CREATE INDEX IF NOT EXISTS "SubscriptionPlanConfig_isActive_idx" ON "SubscriptionPlanConfig"("isActive");

INSERT INTO "SubscriptionPlanConfig" (
  "id",
  "plan",
  "name",
  "monthlyPrice",
  "yearlyPrice",
  "studentsLimit",
  "groupsLimit",
  "sessionsLimit",
  "storageLimit",
  "isActive",
  "updatedAt"
)
VALUES
  ('spc_starter', 'STARTER', 'البداية', 200, 2000, 20, 2, 100, 100, true, NOW()),
  ('spc_professional', 'PROFESSIONAL', 'الاحترافية', 500, 5000, 100, 10, 1000, 1000, true, NOW()),
  ('spc_enterprise', 'ENTERPRISE', 'المؤسسات', 0, 0, 0, 0, 0, 0, true, NOW())
ON CONFLICT ("plan") DO NOTHING;
