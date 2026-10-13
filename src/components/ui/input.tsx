import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex min-h-11 min-w-0 w-full rounded-md border border-border-strong bg-bg px-3 text-sm text-fg placeholder:text-subtle transition-colors",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-28 min-w-0 w-full rounded-lg border border-border-strong bg-bg px-3 py-2 text-sm text-fg placeholder:text-subtle transition-colors",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
