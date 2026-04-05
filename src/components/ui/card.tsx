import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[16px] border border-slate-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-800/90 dark:hover:shadow-[0_12px_24px_rgba(2,6,23,0.35)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b border-slate-200 px-6 py-5 dark:border-slate-800", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-xl font-bold text-slate-900 dark:text-white", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-slate-500 dark:text-slate-400", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-3 px-6 py-5 sm:flex-row", className)} {...props} />;
}
