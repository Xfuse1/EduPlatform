import { CalendarDays, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MockSectionPageProps = {
  title: string;
  description: string;
  items: Array<{
    title: string;
    subtitle?: string;
    meta?: string;
  }>;
};

export function MockSectionPage({ title, description, items }: MockSectionPageProps) {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-[linear-gradient(135deg,_rgba(26,82,118,0.12),_rgba(46,134,193,0.18))]">
          <CardHeader className="border-b-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>{title}</CardTitle>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{description}</p>
              </div>
              <div className="hidden h-14 w-14 items-center justify-center rounded-full bg-white text-primary shadow-sm sm:flex dark:bg-slate-900 dark:text-sky-300">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>
          </CardHeader>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <Card key={`${item.title}-${item.subtitle ?? ""}`}>
            <CardContent className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-sky-400/10 dark:text-sky-300">
                <CalendarDays className="h-5 w-5" />
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{item.title}</p>
              {item.subtitle ? <p className="text-sm text-slate-600 dark:text-slate-300">{item.subtitle}</p> : null}
              {item.meta ? (
                <p className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-primary dark:bg-slate-900 dark:text-sky-300">
                  {item.meta}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
