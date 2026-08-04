import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold",
    "ring-offset-background transition-all duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "active:scale-[0.97]",
    "select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground",
          "shadow-[0_1px_3px_rgb(0,0,0,0.12),0_1px_2px_-1px_rgb(0,0,0,0.12)]",
          "hover:bg-[hsl(241,79%,52%)] hover:shadow-[0_4px_8px_hsl(241,79%,58%,0.35)]",
        ].join(" "),

        destructive: [
          "bg-destructive text-destructive-foreground",
          "shadow-[0_1px_3px_rgb(0,0,0,0.12)]",
          "hover:bg-red-600 hover:shadow-[0_4px_8px_hsl(0,72%,51%,0.35)]",
        ].join(" "),

        outline: [
          "border border-border bg-background text-foreground",
          "hover:bg-muted hover:border-[hsl(var(--border-strong))]",
          "shadow-[var(--shadow-xs)]",
        ].join(" "),

        secondary: [
          "bg-secondary text-secondary-foreground border border-border",
          "hover:bg-muted hover:border-[hsl(var(--border-strong))]",
        ].join(" "),

        ghost: [
          "text-muted-foreground hover:text-foreground hover:bg-muted",
        ].join(" "),

        link: "text-primary underline-offset-4 hover:underline p-0 h-auto shadow-none",

        success: [
          "bg-emerald-600 text-white",
          "hover:bg-emerald-700 hover:shadow-[0_4px_8px_hsl(160,84%,39%,0.3)]",
          "shadow-[var(--shadow-xs)]",
        ].join(" "),

        subtle: [
          "bg-[hsl(var(--primary-subtle))] text-[hsl(var(--primary-subtle-fg))]",
          "hover:bg-indigo-100 border border-indigo-200/60",
        ].join(" "),
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded-md [&_svg]:size-3",
        sm: "h-8 px-3 text-xs rounded-lg [&_svg]:size-3.5",
        default: "h-9 px-4 text-sm rounded-lg [&_svg]:size-4",
        lg: "h-10 px-5 text-sm rounded-lg [&_svg]:size-4",
        xl: "h-12 px-6 text-base rounded-xl [&_svg]:size-5",
        icon: "h-9 w-9 rounded-lg [&_svg]:size-4",
        "icon-sm": "h-7 w-7 rounded-md [&_svg]:size-3.5",
        "icon-lg": "h-10 w-10 rounded-lg [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        suppressHydrationWarning
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
