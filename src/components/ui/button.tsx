import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "frontier-button inline-flex min-w-11 items-center justify-center gap-2 text-center text-sm font-semibold transition-[transform,background-color,color,border-color] duration-150 ease-out disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:translate-y-px",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-press",
        secondary: "bg-bg-subtle text-fg border border-border-strong hover:bg-bg-raised",
        outline: "border border-border-strong bg-transparent text-fg hover:bg-bg-subtle",
        ghost: "text-muted hover:text-fg hover:bg-bg-subtle",
        allow: "bg-allow text-bg",
        deny: "bg-deny/15 text-deny border border-deny/30 hover:bg-deny/25",
      },
      size: {
        default: "min-h-11 px-4 py-2.5 rounded-md",
        sm: "min-h-11 px-3 py-2 rounded-sm text-xs",
        lg: "min-h-12 px-5 py-3 rounded-lg",
        icon: "h-11 w-11 shrink-0 rounded-md",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
