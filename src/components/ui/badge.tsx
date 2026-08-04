import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
    "text-xs font-semibold transition-colors duration-150",
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-primary/10 text-primary hover:bg-primary/15",

        secondary:
          "border border-border bg-secondary text-secondary-foreground hover:bg-muted",

        outline:
          "border border-border text-foreground bg-transparent hover:bg-muted",

        destructive:
          "border border-transparent bg-destructive/10 text-destructive hover:bg-destructive/15",

        success:
          "border border-emerald-200 bg-emerald-50 text-emerald-700",

        warning:
          "border border-amber-200 bg-amber-50 text-amber-700",

        info:
          "border border-blue-200 bg-blue-50 text-blue-700",

        violet:
          "border border-violet-200 bg-violet-50 text-violet-700",

        neutral:
          "border border-slate-200 bg-slate-100 text-slate-600",

        dot: "gap-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
  dotColor?: string
}

function Badge({ className, variant, dot, dotColor, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor || "bg-current")}
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
