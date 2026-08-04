import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border border-border bg-card text-card-foreground",
      "shadow-[0_1px_3px_rgb(0,0,0,0.06),0_1px_2px_-1px_rgb(0,0,0,0.06)]",
      "transition-shadow duration-200",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1 p-5 pb-4", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-base font-semibold leading-tight tracking-tight text-foreground",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center p-5 pt-0 gap-3",
      className
    )}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

/* Compound variant: interactive card with hover lift */
const InteractiveCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border border-border bg-card text-card-foreground",
      "shadow-[0_1px_3px_rgb(0,0,0,0.06)] cursor-pointer",
      "transition-all duration-200",
      "hover:shadow-[0_4px_12px_rgb(0,0,0,0.1)] hover:-translate-y-0.5 hover:border-[hsl(var(--border-strong))]",
      "active:translate-y-0 active:shadow-[0_1px_3px_rgb(0,0,0,0.06)]",
      className
    )}
    {...props}
  />
))
InteractiveCard.displayName = "InteractiveCard"

/* Stat/Metric card variant */
const MetricCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    label: string
    value: string | number
    icon?: React.ReactNode
    delta?: string
    deltaType?: 'up' | 'down' | 'neutral'
    accent?: string
  }
>(({ className, label, value, icon, delta, deltaType = 'neutral', accent, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border border-border bg-card p-5",
      "shadow-[0_1px_3px_rgb(0,0,0,0.06)]",
      "transition-shadow duration-200 hover:shadow-[0_4px_12px_rgb(0,0,0,0.08)]",
      className
    )}
    {...props}
  >
    <div className="flex items-start justify-between gap-2 mb-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {icon && (
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
          accent || "bg-indigo-50 text-indigo-600"
        )}>
          {icon}
        </div>
      )}
    </div>
    <p className="text-2xl font-bold tracking-tight text-foreground" style={{ letterSpacing: '-0.02em' }}>
      {value}
    </p>
    {delta && (
      <p className={cn(
        "mt-1.5 text-xs font-medium inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full",
        deltaType === 'up' && "text-emerald-700 bg-emerald-50",
        deltaType === 'down' && "text-red-700 bg-red-50",
        deltaType === 'neutral' && "text-slate-600 bg-slate-100",
      )}>
        {delta}
      </p>
    )}
  </div>
))
MetricCard.displayName = "MetricCard"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, InteractiveCard, MetricCard }
