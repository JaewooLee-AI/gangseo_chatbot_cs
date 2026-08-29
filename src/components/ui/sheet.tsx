import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { X } from "lucide-react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Sheet({ open, onClose, title, description, children }: SheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Non-blur dark backdrop */}
      <div
        className="fixed inset-0 bg-ace-charcoal/60 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-in panel with bold border */}
      <div className="relative z-10 flex h-full w-full max-w-lg flex-col border-l-4 border-ace-charcoal bg-ace-ivory p-6 shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between border-b-2 border-ace-charcoal pb-4 mb-6">
          <div>
            <h2 className="text-xl font-bold font-sans text-ace-charcoal">{title}</h2>
            {description && <p className="text-xs font-sans text-ace-muted mt-1">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="border-2 border-ace-charcoal bg-white p-1.5 hover:bg-ace-orange transition-colors text-ace-charcoal"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
