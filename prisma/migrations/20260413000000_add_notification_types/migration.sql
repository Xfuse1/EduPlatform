-- Already applied manually via Supabase SQL Editor
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ASSIGNMENT_DUE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EXAM_PUBLISHED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'GRADE_ADDED';
