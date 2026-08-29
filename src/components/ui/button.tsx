import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-bold font-sans transition-all duration-150 rounded-none border-2 border-ace-charcoal focus:outline-none focus:ring-2 focus:ring-ace-orange focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:translate-x-[1px] active:translate-y-[1px]";

    const variantStyles = {
      primary: "bg-ace-charcoal text-white hover:bg-black shadow-brutalist-sm hover:shadow-none",
      secondary: "bg-ace-orange text-ace-charcoal hover:bg-ace-orange-hover shadow-brutalist-sm hover:shadow-none",
      outline: "bg-white text-ace-charcoal hover:bg-ace-ivory shadow-brutalist-sm hover:shadow-none",
      danger: "bg-ace-error text-white hover:bg-red-600 shadow-brutalist-sm hover:shadow-none",
      ghost: "border-transparent bg-transparent hover:bg-ace-cement/40 text-ace-charcoal",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs tracking-wider uppercase font-mono",
      md: "h-11 px-5 text-sm tracking-wide",
      lg: "h-13 px-7 text-base tracking-wide font-extrabold",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
