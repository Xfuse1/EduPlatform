import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "touch-target inline-flex min-h-12 items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary disabled:cursor-not-allowed disabled:opacity-60",
        variant === "default" &&
          "bg-gradient-to-l from-primary to-secondary text-white shadow-lg shadow-primary/20 hover:from-[#164766] hover:to-[#2777ad]",
        variant === "outline" &&
          "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
        variant === "ghost" && "bg-transparent text-primary hover:bg-primary/10 dark:text-sky-300 dark:hover:bg-sky-400/10",
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = "Button";
