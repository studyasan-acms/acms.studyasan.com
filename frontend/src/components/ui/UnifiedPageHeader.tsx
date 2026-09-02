import React from "react";
import { cn } from "@/lib/utils";

export interface UnifiedPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  badge?: string | number | React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Standardized Unified Page Header for StudyAsan
 * Exactly matches Curriculum Management:
 * - Clean title and subtitle directly on the page
 * - No bloated card wrappers or giant gradient icon boxes
 * - Clean right-aligned action buttons
 */
export default function UnifiedPageHeader({
  title,
  subtitle,
  badge,
  actions,
  className,
}: UnifiedPageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5", className)}>
      <div className="space-y-0.5 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight truncate">
            {title}
          </h1>
          {badge !== undefined && badge !== null && (
            <span className="inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full bg-saOrangeSubtle text-saOrangeDark border border-saVividOrange/30 shrink-0">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-normal">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}
