import { CalendarDays } from "lucide-react";

import { formatTime12Hour } from "@/lib/utils";

type StudentScheduleSession = {
  id: string;
  subject: string;
  day: string;
  timeStart: string;
  timeEnd: string;
  color: string;
  isToday: boolean;
};

type StudentScheduleProps = {
  sessions: StudentScheduleSession[];
};

const orderedDays = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"] as const;

function formatArabicTime(value: string) {
  return formatTime12Hour(value);
}

function getStatus(session: StudentScheduleSession, todayDay: string | undefined) {
  if (session.isToday) {
    return {
      label: "اليوم",
      dotClassName: "bg-emerald-500",
      textClassName: "text-emerald-700 dark:text-emerald-300",
    };
  }

  const todayIndex = todayDay ? orderedDays.indexOf(todayDay as (typeof orderedDays)[number]) : -1;
  const sessionIndex = orderedDays.indexOf(session.day as (typeof orderedDays)[number]);

  if (todayIndex === -1 || sessionIndex >= todayIndex) {
    return {
      label: "قادمة",
      dotClassName: "bg-sky-500",
      textClassName: "text-sky-700 dark:text-sky-300",
    };
  }

  return {
    label: "منتهية",
    dotClassName: "bg-slate-500",
    textClassName: "text-slate-700 dark:text-slate-300",
  };
}

export function StudentSchedule({ sessions }: StudentScheduleProps) {
  const todayDay = sessions.find((session) => session.isToday)?.day;

  const sortedSessions = [...sessions].sort((first, second) => {
    if (first.isToday !== second.isToday) {
      return first.isToday ? -1 : 1;
    }

    return orderedDays.indexOf(first.day as (typeof orderedDays)[number]) - orderedDays.indexOf(second.day as (typeof orderedDays)[number]);
  });

  const sessionsByDay = orderedDays
    .map((day) => ({
      day,
      isToday: day === todayDay,
      sessions: sortedSessions.filter((session) => session.day === day),
    }))
    .filter((group) => group.sessions.length > 0)
    .sort((first, second) => {
      if (first.isToday !== second.isToday) {
        return first.isToday ? -1 : 1;
      }

      return orderedDays.indexOf(first.day) - orderedDays.indexOf(second.day);
    });

  return (
    <section className="page-enter space-y-6">
      <header className="rounded-[24px] bg-[linear-gradient(135deg,_#163b54,_#1A5276_48%,_#5dade2)] px-6 py-7 text-white shadow-[0_20px_60px_rgba(26,82,118,0.22)]">
        <p className="text-start text-sm font-semibold text-white/80">حصصك هذا الأسبوع</p>
        <h1 className="mt-2 text-start text-3xl font-extrabold">جدولي الأسبوعي</h1>
        <p className="mt-3 max-w-2xl text-start text-sm leading-7 text-white/85">
          تابع مواعيد حصصك بسهولة مع إبراز حصص اليوم أولًا وتنظيم واضح لكل يوم.
        </p>
      </header>

      {sessionsByDay.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <CalendarDays className="h-8 w-8" />
          </div>
          <p className="mt-4 text-lg font-bold text-slate-900 dark:text-white">لا توجد حصص هذا الأسبوع</p>
        </div>
      ) : (
        sessionsByDay.map((group) => (
          <section
            key={group.day}
            className={`rounded-[24px] border bg-white p-4 shadow-sm dark:bg-slate-900 sm:p-5 ${
              group.isToday ? "border-primary dark:border-sky-400" : "border-slate-200 dark:border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-start text-xl font-bold text-slate-900 dark:text-white">{group.day}</h2>
              {group.isToday ? (
                <span className="rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary dark:bg-sky-400/10 dark:text-sky-300">
                  اليوم
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              {group.sessions.map((session) => {
                const status = getStatus(session, todayDay);

                return (
                  <article
                    key={session.id}
                    className="min-h-20 rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/60"
                    style={{ borderInlineStart: `6px solid ${session.color}` }}
                  >
                    <div className="flex min-h-11 items-start justify-between gap-3">
                      <div className="space-y-3">
                        <h3 className="text-start text-lg font-extrabold text-slate-900 dark:text-white">{session.subject}</h3>
                        <p className="text-start text-sm font-medium text-slate-600 dark:text-slate-300">
                          {session.day} {"—"}{" "}
                          <span dir="ltr">
                            {formatArabicTime(session.timeStart)} حتى {formatArabicTime(session.timeEnd)}
                          </span>
                        </p>
                      </div>
                      <div className={`flex min-h-11 items-center gap-2 rounded-full px-3 py-2 text-sm font-bold ${status.textClassName}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${status.dotClassName}`} />
                        {status.label}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
    </section>
  );
}
