import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em]",
  {
    variants: {
      tone: {
        default: "bg-bg-subtle text-muted border border-border",
        accent: "bg-accent/15 text-accent border border-accent/25",
        allow: "bg-allow/15 text-allow border border-allow/25",
        deny: "bg-deny/15 text-deny border border-deny/25",
        pending: "bg-pending/15 text-pending border border-pending/25",
      },
    },
    defaultVariants: { tone: "default" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
