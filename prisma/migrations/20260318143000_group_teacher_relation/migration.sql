ALTER TABLE "Group" ADD COLUMN "teacherId" TEXT;

ALTER TABLE "Group"
ADD CONSTRAINT "Group_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "Group_tenantId_teacherId_idx" ON "Group"("tenantId", "teacherId");

WITH single_teachers AS (
  SELECT "tenantId", MIN("id") AS teacher_id
  FROM "User"
  WHERE "role" = 'TEACHER' AND "isActive" = true
  GROUP BY "tenantId"
  HAVING COUNT(*) = 1
)
UPDATE "Group" AS g
SET "teacherId" = single_teachers.teacher_id
FROM single_teachers
WHERE g."tenantId" = single_teachers."tenantId"
  AND g."teacherId" IS NULL;
