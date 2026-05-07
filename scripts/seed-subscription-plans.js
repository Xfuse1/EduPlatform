const fs = require("node:fs");
const path = require("node:path");

function loadDotEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

function normalizeDatasourceUrl(rawUrl) {
  if (!rawUrl) return rawUrl;

  try {
    const url = new URL(rawUrl);
    if (url.hostname.includes("pooler.supabase.com") && !url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "1");
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

loadDotEnv();

const datasourceUrls = [
  process.env.DIRECT_URL,
  process.env.DATABASE_URL,
]
  .filter(Boolean)
  .map(normalizeDatasourceUrl)
  .filter((url, index, urls) => urls.indexOf(url) === index);

const { PrismaClient } = require("../src/generated/client");

function createClient(url) {
  return new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
  });
}

const plans = [
  {
    id: "plan_starter",
    key: "STARTER",
    plan: "STARTER",
    name: "البداية",
    monthlyPrice: 200,
    yearlyPrice: 2000,
    studentsLimit: 20,
    groupsLimit: 2,
    sessionsLimit: 100,
    storageLimit: 100,
  },
  {
    id: "plan_professional",
    key: "PROFESSIONAL",
    plan: "PROFESSIONAL",
    name: "الاحترافية",
    monthlyPrice: 500,
    yearlyPrice: 5000,
    studentsLimit: 100,
    groupsLimit: 10,
    sessionsLimit: 1000,
    storageLimit: 1000,
  },
  {
    id: "plan_enterprise",
    key: "ENTERPRISE",
    plan: "ENTERPRISE",
    name: "المؤسسات",
    monthlyPrice: 0,
    yearlyPrice: 0,
    studentsLimit: 9999,
    groupsLimit: 9999,
    sessionsLimit: 9999,
    storageLimit: 9999,
  },
];

async function ensureSchema(prisma) {
  await prisma.$executeRawUnsafe(`
DO $$
BEGIN
  CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'PROFESSIONAL', 'ENTERPRISE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
`);

  await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "SubscriptionPlanConfig" (
  "id" TEXT NOT NULL,
  "plan" "SubscriptionPlan",
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "monthlyPrice" INTEGER NOT NULL,
  "yearlyPrice" INTEGER NOT NULL,
  "studentsLimit" INTEGER NOT NULL,
  "groupsLimit" INTEGER NOT NULL,
  "sessionsLimit" INTEGER NOT NULL,
  "storageLimit" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionPlanConfig_pkey" PRIMARY KEY ("id")
);
`);

  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPlanConfig_key_key" ON "SubscriptionPlanConfig"("key");`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPlanConfig_plan_key" ON "SubscriptionPlanConfig"("plan");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SubscriptionPlanConfig_isActive_idx" ON "SubscriptionPlanConfig"("isActive");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SubscriptionPlanConfig_deletedAt_idx" ON "SubscriptionPlanConfig"("deletedAt");`);
}

async function seedPlans(prisma) {
  await ensureSchema(prisma);

  for (const plan of plans) {
    await prisma.subscriptionPlanConfig.upsert({
      where: { key: plan.key },
      create: {
        ...plan,
        isActive: true,
        deletedAt: null,
      },
      update: {
        plan: plan.plan,
        name: plan.name,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        studentsLimit: plan.studentsLimit,
        groupsLimit: plan.groupsLimit,
        sessionsLimit: plan.sessionsLimit,
        storageLimit: plan.storageLimit,
        isActive: true,
        deletedAt: null,
      },
    });

    console.log(`Seeded ${plan.key}`);
  }
}

async function main() {
  if (datasourceUrls.length === 0) {
    throw new Error("DATABASE_URL is missing. Add it to .env or the shell environment.");
  }

  let lastError;

  for (const url of datasourceUrls) {
    const prisma = createClient(url);

    try {
      await seedPlans(prisma);
      console.log("Subscription plans table is ready.");
      await prisma.$disconnect();
      return;
    } catch (error) {
      lastError = error;
      await prisma.$disconnect().catch(() => undefined);

      if (datasourceUrls.indexOf(url) < datasourceUrls.length - 1) {
        console.warn("Database connection failed, trying the next configured URL.");
      }
    }
  }

  throw lastError;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
