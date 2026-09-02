import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  iconColor?: string;
  iconTextColor?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Universal page header — consistent clean title + subtitle + actions bar
 * used across all Admin / Teacher / Student pages, matching Curriculum Management.
 */
export default function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5",
        className
      )}
    >
      <div className="space-y-0.5 min-w-0">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight truncate tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-normal">{subtitle}</p>
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
