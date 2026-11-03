"use client";

import React, { useEffect, useRef, useState, useCallback, useId } from "react";
import { cn } from "@/lib/utils";

export interface GliderOption {
  id: string;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  disabled?: boolean;
}

export interface GliderNavProps {
  options: GliderOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  tabClassName?: string;
  size?: "sm" | "default" | "lg";
  ariaLabel?: string;
}

/**
 * GliderNav - High-fidelity segmented pill navigation with smooth sliding glider.
 * Matches the capsule design: white container, signature blue elevation shadow,
 * soft ice-blue (#e6eef9) sliding glider, vibrant (#185ee0) active text, and dynamic badges.
 */
export function GliderNav({
  options,
  value,
  onChange,
  className,
  tabClassName,
  size = "default",
  ariaLabel,
}: GliderNavProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [glider, setGlider] = useState<{
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

  const updateGlider = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const activeEl = container.querySelector<HTMLElement>(`[data-value="${CSS.escape(value)}"]`);
    if (activeEl) {
      setGlider({
        left: activeEl.offsetLeft,
        top: activeEl.offsetTop,
        width: activeEl.offsetWidth,
        height: activeEl.offsetHeight,
        ready: true,
      });
    }
  }, [value]);

  useEffect(() => {
    updateGlider();
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => updateGlider());
    ro.observe(container);
    container.querySelectorAll('button[role="tab"]').forEach((child) => ro.observe(child));

    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(updateGlider);
    }

    const raf1 = requestAnimationFrame(() => {
      updateGlider();
      requestAnimationFrame(updateGlider);
    });
    window.addEventListener("resize", updateGlider);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateGlider);
      cancelAnimationFrame(raf1);
    };
  }, [updateGlider]);

  const sizeClasses = {
    sm: "h-7 text-xs px-2.5 gap-1.5",
    default: "h-8 sm:h-9 text-xs sm:text-sm px-3.5 sm:px-4 gap-2",
    lg: "h-10 text-sm px-5 gap-2.5",
  };

  const padClasses = {
    sm: "p-1",
    default: "p-1.5",
    lg: "p-2",
  };

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "glider-tabs relative inline-flex items-center bg-white rounded-full select-none max-w-full overflow-x-auto scrollbar-none",
        "border border-slate-200/90 shadow-none",
        padClasses[size],
        className
      )}
    >
      {/* Sliding Glider Pill: Anchored to (top: 0, left: 0) with zero margin so translate3d(offsetLeft, offsetTop) aligns with 0px offset */}
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

      {/* Tabs */}
      {options.map((opt) => {
        const isActive = opt.id === value;
        const Icon = opt.icon;

        return (
          <button
            type="button"
            key={opt.id}
            role="tab"
            aria-selected={isActive}
            data-value={opt.id}
            disabled={opt.disabled}
            onClick={() => !opt.disabled && onChange(opt.id)}
            className={cn(
              "glider-tab relative z-[2] inline-flex items-center justify-center font-medium rounded-full cursor-pointer whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#185ee0]/40 disabled:opacity-40 disabled:pointer-events-none",
              sizeClasses[size],
              isActive
                ? "text-[#185ee0] font-bold"
                : "text-slate-700 hover:text-[#185ee0]",
              tabClassName
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  "w-3.5 h-3.5 shrink-0 transition-colors",
                  isActive ? "text-[#185ee0]" : "text-slate-500"
                )}
              />
            )}
            <span>{opt.label}</span>
            {opt.badge !== undefined && opt.badge !== null && (
              <span
                className={cn(
                  "glider-notification inline-flex items-center justify-center min-w-4 h-4 px-1.5 rounded-full text-[10px] font-bold transition-all ml-0.5",
                  isActive
                    ? "bg-[#185ee0] text-white"
                    : "bg-[#e6eef9] text-[#185ee0]"
                )}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Radio - Exact radio input implementation of the user's snippet.
 * Renders radio inputs with labels and animated glider.
 */
export function Radio({
  options = [
    { id: "radio-1", label: "Hello", badge: 2 },
    { id: "radio-2", label: "UI" },
    { id: "radio-3", label: "World" },
  ],
  name,
  defaultValue = "radio-1",
  value,
  onChange,
  className,
}: {
  options?: Array<{ id: string; label: string; badge?: number | string }>;
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (id: string) => void;
  className?: string;
}) {
  const generatedName = useId();
  const radioGroupName = name || `radio-tabs-${generatedName}`;
  const [internalVal, setInternalVal] = useState(defaultValue);
  const currentVal = value !== undefined ? value : internalVal;

  const handleChange = (id: string) => {
    setInternalVal(id);
    onChange?.(id);
  };

  return (
    <div className={cn("glider-container inline-flex", className)}>
      <GliderNav
        options={options.map((o) => ({
          id: o.id,
          label: o.label,
          badge: o.badge,
        }))}
        value={currentVal}
        onChange={handleChange}
        ariaLabel={radioGroupName}
      />
    </div>
  );
}

export default Radio;
