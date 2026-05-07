-- Insert default subscription plans if they don't exist
INSERT INTO "SubscriptionPlanConfig" (key, plan, name, "monthlyPrice", "yearlyPrice", "studentsLimit", "groupsLimit", "sessionsLimit", "storageLimit", "isActive", "createdAt", "updatedAt", "deletedAt")
VALUES 
  ('STARTER', 'STARTER', 'البداية', 200, 2000, 20, 2, 100, 100, true, NOW(), NOW(), NULL),
  ('PROFESSIONAL', 'PROFESSIONAL', 'الاحترافية', 500, 5000, 100, 10, 1000, 1000, true, NOW(), NOW(), NULL),
  ('ENTERPRISE', 'ENTERPRISE', 'المؤسسات', 0, 0, 9999, 9999, 9999, 9999, true, NOW(), NOW(), NULL)
ON CONFLICT (key) DO UPDATE SET
  plan = EXCLUDED.plan,
  name = EXCLUDED.name,
  "monthlyPrice" = EXCLUDED."monthlyPrice",
  "yearlyPrice" = EXCLUDED."yearlyPrice",
  "studentsLimit" = EXCLUDED."studentsLimit",
  "groupsLimit" = EXCLUDED."groupsLimit",
  "sessionsLimit" = EXCLUDED."sessionsLimit",
  "storageLimit" = EXCLUDED."storageLimit",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW(),
  "deletedAt" = NULL;
