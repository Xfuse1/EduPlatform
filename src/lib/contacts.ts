import type { SessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Compute the set of user ids the given user is allowed to message / converse with.
 *
 * Messaging is intentionally CROSS-TENANT for parent<->teacher (parents live in
 * their own `parent-*` tenant while the teacher lives in the child's center
 * tenant), so the allow-list is relationship-based, NOT same-tenant. This mirrors
 * (and is the enforcement counterpart of) /api/contacts.
 *
 * - PARENT  -> teachers in the tenants of their children's active groups
 * - TEACHER -> students in their groups + parents of those students
 * - STUDENT -> teachers of their active groups
 * - staff (ASSISTANT/MANAGER/ADMIN/CENTER_ADMIN) -> same-tenant non-student users
 */
export async function getAllowedContactIds(user: SessionUser): Promise<Set<string>> {
  const ids = new Set<string>();

  if (user.role === "PARENT") {
    const links = await db.parentStudent.findMany({
      where: { parentId: user.id },
      select: { studentId: true },
    });
    const studentIds = links.map((l) => l.studentId);
    if (studentIds.length === 0) return ids;

    const enrollments = await db.groupStudent.findMany({
      where: { studentId: { in: studentIds }, status: "ACTIVE" },
      select: { group: { select: { tenantId: true } } },
    });
    const tenantIds = Array.from(new Set(enrollments.map((e) => e.group.tenantId)));
    if (tenantIds.length === 0) return ids;

    const teachers = await db.user.findMany({
      where: { tenantId: { in: tenantIds }, role: "TEACHER" },
      select: { id: true },
    });
    teachers.forEach((t) => ids.add(t.id));
    return ids;
  }

  if (user.role === "TEACHER") {
    const enrollments = await db.groupStudent.findMany({
      where: { group: { teacherId: user.id }, status: "ACTIVE" },
      select: { studentId: true },
    });
    const studentIds = Array.from(new Set(enrollments.map((e) => e.studentId)));
    studentIds.forEach((id) => ids.add(id)); // teacher may message their students

    if (studentIds.length > 0) {
      const links = await db.parentStudent.findMany({
        where: { studentId: { in: studentIds } },
        select: { parentId: true },
      });
      links.forEach((l) => ids.add(l.parentId));
    }
    return ids;
  }

  if (user.role === "STUDENT") {
    const enrollments = await db.groupStudent.findMany({
      where: { studentId: user.id, status: "ACTIVE" },
      select: { group: { select: { teacherId: true } } },
    });
    enrollments
      .map((e) => e.group.teacherId)
      .filter((id): id is string => Boolean(id))
      .forEach((id) => ids.add(id));
    return ids;
  }

  // Staff roles: same-tenant, non-student users.
  if (["ASSISTANT", "MANAGER", "ADMIN", "CENTER_ADMIN"].includes(user.role)) {
    const users = await db.user.findMany({
      where: { tenantId: user.tenantId, id: { not: user.id }, role: { not: "STUDENT" } },
      select: { id: true },
    });
    users.forEach((u) => ids.add(u.id));
  }

  return ids;
}
