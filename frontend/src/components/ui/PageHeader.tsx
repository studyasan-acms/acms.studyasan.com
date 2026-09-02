import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  iconColor?: string;        // Tailwind bg class e.g. "bg-saBlueSubtle"
  iconTextColor?: string;    // Tailwind text class e.g. "text-saBlue"
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Universal page header — consistent title + subtitle + actions bar
 * used across all Admin / Teacher / Student pages.
 */
export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  iconColor = "bg-saBlueSubtle",
  iconTextColor = "text-saBlue",
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5",
        className
      )}
    >
      {/* Left: icon + title + subtitle */}
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div
            className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0",
              iconColor
            )}
          >
            <Icon className={cn("h-5 w-5", iconTextColor)} />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-0.5 leading-snug">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right: action buttons */}
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}
