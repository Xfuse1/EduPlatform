import { cache } from "react";

import { db } from "@/lib/db";

export type TeacherListItem = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  subject: string | null;
  bio: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  groupsCount: number;
  studentsCount: number;
};

export const getTeachersPageData = cache(async (tenantId: string) => {
  const [teachers, groups] = await Promise.all([
    db.user.findMany({
      where: {
        tenantId,
        role: "TEACHER",
        isActive: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        subject: true,
        bio: true,
        createdAt: true,
        lastLoginAt: true,
      },
    }),
    db.group.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        teacherId: true,
        students: {
          where: {
            status: {
              in: ["ACTIVE", "WAITLIST"],
            },
          },
          select: {
            studentId: true,
          },
        },
      },
    }),
  ]);

  const teacherItems: TeacherListItem[] = teachers.map((teacher) => {
    const relevantGroups = teachers.length === 1 ? groups : groups.filter((group) => group.teacherId === teacher.id);
    const studentIds = new Set(relevantGroups.flatMap((group) => group.students.map((student) => student.studentId)));

    return {
      id: teacher.id,
      name: teacher.name,
      phone: teacher.phone,
      email: teacher.email,
      subject: teacher.subject,
      bio: teacher.bio,
      createdAt: teacher.createdAt.toISOString(),
      lastLoginAt: teacher.lastLoginAt?.toISOString() ?? null,
      groupsCount: relevantGroups.length,
      studentsCount: studentIds.size,
    };
  });

  return {
    teachers: teacherItems,
  };
});
