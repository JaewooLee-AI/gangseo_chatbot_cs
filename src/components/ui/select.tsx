import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, value, onChange, ...props }, ref) => {
    return (
      <div className="relative inline-block w-full">
        <select
          ref={ref}
          value={value}
          onChange={onChange}
          className={cn(
            "flex h-11 w-full appearance-none rounded-none border-2 border-ace-charcoal bg-white px-3.5 py-2 pr-8 text-sm font-sans font-medium text-ace-charcoal focus:outline-none focus:ring-2 focus:ring-ace-orange cursor-pointer",
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-ace-charcoal font-bold">
          ▼
        </div>
      </div>
    );
  }
);
Select.displayName = "Select";
