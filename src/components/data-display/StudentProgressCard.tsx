import { TrendingUp, Trophy } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toArabicDigits } from "@/lib/utils";

export function StudentProgressCard({
  studentName,
  attendanceRate,
  homeworkCompletion,
  note,
  streakLabel,
}: {
  studentName: string;
  attendanceRate: number;
  homeworkCompletion: number;
  note: string;
  streakLabel: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-start text-lg font-bold text-slate-900 dark:text-white">{studentName}</p>
            <p className="mt-2 text-start text-sm leading-7 text-slate-600 dark:text-slate-300">{note}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-sky-400/10 dark:text-sky-300">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span>الالتزام بالحضور</span>
              <span>{toArabicDigits(attendanceRate)}%</span>
            </div>
            <Progress className="h-3" value={attendanceRate} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span>إنجاز الواجب</span>
              <span>{toArabicDigits(homeworkCompletion)}%</span>
            </div>
            <Progress className="h-3" value={homeworkCompletion} />
          </div>
        </div>

        <div className="inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">
          <Trophy className="h-4 w-4" />
          {streakLabel}
        </div>
      </CardContent>
    </Card>
  );
}
