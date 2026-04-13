import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAuth();

    if (user.role === "PARENT") {
      // جلب الأطفال المرتبطين بولي الأمر
      const parentStudents = await db.parentStudent.findMany({
        where: { parentId: user.id },
        select: { studentId: true },
      });

      const studentIds = parentStudents.map((ps) => ps.studentId);
      if (studentIds.length === 0) return NextResponse.json([]);

      // جلب التينانتات الخاصة بالمجموعات المسجل فيها الأطفال
      const enrollments = await db.groupStudent.findMany({
        where: { studentId: { in: studentIds }, status: "ACTIVE" },
        select: { group: { select: { tenantId: true } } },
      });

      const tenantIds = Array.from(new Set(enrollments.map((e) => e.group.tenantId)));
      if (tenantIds.length === 0) return NextResponse.json([]);

      // جلب المدرسين من تلك التينانتات
      const teachers = await db.user.findMany({
        where: { tenantId: { in: tenantIds }, role: "TEACHER" },
        select: { id: true, name: true, role: true, avatarUrl: true },
      });

      return NextResponse.json(
        teachers.map((u) => ({ id: u.id, name: u.name, role: "المدرس", avatar: u.avatarUrl }))
      );
    }

    if (user.role === "TEACHER") {
      // جلب الطلاب المسجلين في مجموعات المدرس
      const enrollments = await db.groupStudent.findMany({
        where: { group: { tenantId: user.tenantId }, status: "ACTIVE" },
        select: { studentId: true },
      });

      const studentIds = Array.from(new Set(enrollments.map((e) => e.studentId)));
      if (studentIds.length === 0) return NextResponse.json([]);

      // جلب أولياء الأمور المرتبطين بهؤلاء الطلاب
      const parentStudents = await db.parentStudent.findMany({
        where: { studentId: { in: studentIds } },
        include: { parent: { select: { id: true, name: true, role: true, avatarUrl: true } } },
      });

      const uniqueParents = new Map<string, (typeof parentStudents)[0]["parent"]>();
      for (const ps of parentStudents) {
        if (!uniqueParents.has(ps.parent.id)) {
          uniqueParents.set(ps.parent.id, ps.parent);
        }
      }

      return NextResponse.json(
        Array.from(uniqueParents.values()).map((u) => ({
          id: u.id,
          name: u.name,
          role: "ولي أمر",
          avatar: u.avatarUrl,
        }))
      );
    }

    // الأدوار الأخرى (ASSISTANT وغيره): نفس التينانت فقط
    const users = await db.user.findMany({
      where: { tenantId: user.tenantId, id: { not: user.id }, role: { not: "STUDENT" } },
      select: { id: true, name: true, role: true, avatarUrl: true },
    });

    return NextResponse.json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role === "TEACHER" ? "المدرس" : u.role === "PARENT" ? "ولي أمر" : "طالب",
        avatar: u.avatarUrl,
      }))
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
