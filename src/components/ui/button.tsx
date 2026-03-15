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
        "touch-target inline-flex min-h-11 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary disabled:cursor-not-allowed disabled:opacity-60",
        variant === "default" && "bg-primary text-white hover:bg-primary/90",
        variant === "outline" && "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
        variant === "ghost" && "bg-transparent text-primary hover:bg-primary/10",
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = "Button";
