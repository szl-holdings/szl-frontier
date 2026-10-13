import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "min-h-11 min-w-0 w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm text-fg transition-colors",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
