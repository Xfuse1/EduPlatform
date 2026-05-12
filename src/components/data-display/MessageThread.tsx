import { MessageSquareText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ThreadMessage = {
  id: string;
  sender: string;
  body: string;
  timeLabel: string;
  isOwn: boolean;
};

export function MessageThread({
  title,
  messages,
}: {
  title: string;
  messages: ThreadMessage[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-start">
          <MessageSquareText className="h-5 w-5 text-primary dark:text-sky-300" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {messages.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-5 text-start text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            لا توجد رسائل بعد.
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex ${message.isOwn ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[92%] rounded-[18px] px-3 py-3 sm:max-w-[85%] sm:rounded-[22px] sm:px-4 ${message.isOwn ? "bg-primary text-white dark:bg-sky-500 dark:text-slate-950" : "bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100"}`}>
                <div className="mb-1 flex flex-col gap-1 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between min-[420px]:gap-3">
                  <span className="text-xs font-bold opacity-85">{message.sender}</span>
                  <span className="text-[11px] opacity-75">{message.timeLabel}</span>
                </div>
                <p className="text-sm leading-7">{message.body}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
