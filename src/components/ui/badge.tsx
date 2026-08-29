import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const baseStyles =
    "inline-flex items-center px-2.5 py-0.5 text-xs font-mono font-bold tracking-wider rounded-none border border-ace-charcoal transition-colors";

  const variantStyles = {
    default: "bg-ace-charcoal text-white",
    secondary: "bg-ace-cement text-ace-charcoal",
    destructive: "bg-ace-error text-white border-ace-charcoal",
    success: "bg-emerald-100 text-emerald-900 border-emerald-700",
    outline: "bg-white text-ace-charcoal",
  };

  return (
    <div className={cn(baseStyles, variantStyles[variant], className)} {...props} />
  );
}
