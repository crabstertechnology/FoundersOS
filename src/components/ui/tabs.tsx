"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

export { GliderNav, Radio } from "./glider-nav"
export type { GliderOption, GliderNavProps } from "./glider-nav"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const isVertical = typeof className === 'string' && (className.includes('flex-col') || className.includes('bg-transparent'));
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  if (isVertical) {
    return (
      <TabsPrimitive.List
        ref={ref}
        className={cn("flex flex-col w-full h-auto bg-transparent gap-1 p-0", className)}
        {...props}
      >
        {children}
      </TabsPrimitive.List>
    );
  }
  const [glider, setGlider] = React.useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    ready: boolean;
  }>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    ready: false,
  });

  const updateGlider = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const activeChild = el.querySelector<HTMLElement>('[data-state="active"]');
    if (activeChild) {
      setGlider({
        left: activeChild.offsetLeft,
        top: activeChild.offsetTop,
        width: activeChild.offsetWidth,
        height: activeChild.offsetHeight,
        ready: true,
      });
    }
  }, []);

  React.useEffect(() => {
    updateGlider();
    const el = containerRef.current;
    if (!el) return;

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "data-state") {
          updateGlider();
          break;
        }
      }
    });

    observer.observe(el, { attributes: true, subtree: true, attributeFilter: ["data-state"] });

    const ro = new ResizeObserver(() => updateGlider());
    ro.observe(el);
    el.querySelectorAll('[role="tab"], button').forEach((child) => ro.observe(child));

    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(updateGlider);
    }

    window.addEventListener("resize", updateGlider);
    const raf1 = requestAnimationFrame(() => {
      updateGlider();
      requestAnimationFrame(updateGlider);
    });

    return () => {
      observer.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", updateGlider);
      cancelAnimationFrame(raf1);
    };
  }, [updateGlider]);

  React.useImperativeHandle(ref, () => containerRef.current!);

  return (
    <TabsPrimitive.List
      ref={containerRef}
      className={cn(
        "glider-tabs relative inline-flex items-center gap-1 p-1.5 rounded-full bg-white select-none max-w-full overflow-x-auto scrollbar-none",
        "border border-slate-200/90 shadow-none",
        className
      )}
      {...props}
    >
      {/* Dynamic Animated Glider Pill: Anchored to (top: 0, left: 0) with zero margin */}
      <span
        aria-hidden="true"
        className={cn(
          "glider-pill pointer-events-none absolute top-0 left-0 m-0 rounded-full bg-[#e6eef9] z-[1]",
          glider.ready
            ? "opacity-100 transition-all duration-250 ease-out"
            : "opacity-0 transition-none"
        )}
        style={{
          top: 0,
          left: 0,
          transform: `translate3d(${glider.left}px, ${glider.top}px, 0)`,
          width: `${glider.width}px`,
          height: `${glider.height}px`,
        }}
      />
      {children}
    </TabsPrimitive.List>
  );
});
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    suppressHydrationWarning
    className={cn(
      "glider-tab relative z-[2] inline-flex items-center justify-center gap-1.5 whitespace-nowrap",
      "rounded-full px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-medium cursor-pointer",
      "text-slate-700 transition-colors duration-150 select-none",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#185ee0]/40",
      "disabled:pointer-events-none disabled:opacity-40",
      "data-[state=active]:text-[#185ee0] data-[state=active]:font-bold data-[state=active]:bg-transparent data-[state=active]:shadow-none",
      "hover:text-[#185ee0]",
      className
    )}
    {...props}
  >
    {children}
  </TabsPrimitive.Trigger>
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsBadge = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "glider-notification ml-1.5 min-w-4 h-4 px-1.5 rounded-full text-[10px] font-bold inline-flex items-center justify-center transition-all bg-[#e6eef9] text-[#185ee0]",
      className
    )}
    {...props}
  />
))
TabsBadge.displayName = "TabsBadge"

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-0 outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent, TabsBadge }
