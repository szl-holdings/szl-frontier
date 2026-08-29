import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full appearance-none rounded-md border border-border bg-bg bg-[length:12px] bg-[right_12px_center] bg-no-repeat px-3 pr-8 text-sm text-fg outline-none transition-colors focus:border-border-strong focus:ring-2 focus:ring-ring/30",
        className,
      )}
      style={{
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%238e8e88' stroke-width='1.6' viewBox='0 0 24 24'><path d='M6 9l6 6 6-6'/></svg>")`,
      }}
      {...props}
    >
      {children}
    </select>
  );
}
