CREATE TYPE "TenantAccountType" AS ENUM ('CENTER', 'TEACHER');

ALTER TABLE "Tenant"
ADD COLUMN "accountType" "TenantAccountType" NOT NULL DEFAULT 'TEACHER';
