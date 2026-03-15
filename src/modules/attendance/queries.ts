import { cache } from "react";

import { db } from "@/lib/db";

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export const getTodaySessions = cache(async (tenantId: string) => {
  const today = new Date();

  return db.session.findMany({
    where: {
      tenantId,
      date: { gte: startOfDay(today), lte: endOfDay(today) },
    },
    orderBy: { timeStart: "asc" },
    select: {
      id: true,
      timeStart: true,
      timeEnd: true,
      status: true,
      group: { select: { name: true } },
    },
  });
});

export const getAttendanceOverview = cache(async (tenantId: string) => {
  const records = await db.attendance.findMany({
    where: { tenantId },
    select: { status: true },
  });

  const presentCount = records.filter((record) => record.status === "PRESENT").length;
  const rate = records.length === 0 ? 0 : Math.round((presentCount / records.length) * 100);

  return { rate, change: 4 };
});

export const getStudentAttendanceSnapshot = cache(async (tenantId: string, studentId: string) => {
  const records = await db.attendance.findMany({
    where: { tenantId, studentId },
    select: { status: true },
  });

  const presentCount = records.filter((record) => record.status === "PRESENT").length;

  return {
    rate: records.length === 0 ? 0 : Math.round((presentCount / records.length) * 100),
  };
});
