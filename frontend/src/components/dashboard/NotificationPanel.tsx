import { useEffect, useCallback, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotificationStore } from "@/store/notificationStore";
import {
  Check,
  CheckCheck,
  Trash2,
  Info,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({
  isOpen,
  onClose,
}: NotificationPanelProps) {
  const {
    notifications,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationStore();

  // Track if notifications have been fetched in this session
  const hasInitiallyFetched = useRef(false);

  useEffect(() => {
    // Only fetch notifications once when panel opens, not on every render
    if (isOpen && !hasInitiallyFetched.current) {
      hasInitiallyFetched.current = true;
      fetchNotifications();
    }

    // Reset flag when panel closes to allow fresh fetch on next open
    if (!isOpen) {
      hasInitiallyFetched.current = false;
    }
  }, [isOpen]);

  const getIcon = (type: Notification["type"]) => {
    const style = "h-5 w-5";
    switch (type) {
      case "INFO":
        return <Info className={`${style} text-saBlueLight`} />;
      case "WARNING":
        return <AlertTriangle className={`${style} text-saVividOrange`} />;
      case "SUCCESS":
        return <CheckCircle2 className={`${style} text-green-500`} />;
      default:
        return <Info className={`${style} text-gray-500`} />;
    }
  };

  const getBadge = (type: Notification["type"]) => {
    switch (type) {
      case "INFO":
        return "default";
      case "SUCCESS":
        return "outline";
      case "WARNING":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 animate-fadeIn"
          onClick={onClose}
        />
      )}

      {/* Sliding Panel */}
      <div
        className={cn(
          "fixed top-16 right-0 bottom-0 w-full sm:w-96",
          "bg-white shadow-2xl border-l border-slate-200 rounded-tl-2xl flex flex-col",
          "transform transition-transform duration-300 ease-in-out z-50",
          "will-change-transform",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header — Solid StudyAsan Blue */}
        <div className="p-4 flex items-center justify-between rounded-tl-2xl bg-saBlue border-b border-white/10">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-tight">Notifications</h2>
            {notifications.some((n) => !n.is_read) && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-saVividOrange text-white">
                {notifications.filter((n) => !n.is_read).length} new
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.is_read) && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors flex items-center gap-1"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20 rounded-xl"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="animate-spin h-8 w-8 rounded-full border-2 border-saBlue border-t-transparent" />
              <p className="text-xs text-slate-400 font-medium">Fetching notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-saBlue border border-blue-200 flex items-center justify-center mb-3 shadow-xs">
                <Info className="h-6 w-6 text-saBlue" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No New Notifications</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                You're all caught up! New updates, reminders, and alerts will appear here.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "p-3.5 rounded-2xl shadow-xs bg-white border transition-all",
                  "hover:shadow-md",
                  !n.is_read
                    ? "border-l-4 border-l-saVividOrange border-saBlue/20 bg-saBlueSubtle/20"
                    : "border-slate-200/80"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="mt-0.5 p-1.5 rounded-xl bg-slate-100 shrink-0">
                    {getIcon(n.type)}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 leading-tight">
                      {n.title}
                    </p>

                    {n.description && (
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed line-clamp-2">
                        {n.description}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-2 mt-2 pt-1 border-t border-slate-100/80">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {n.type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    {!n.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-saBlue hover:bg-saBlueSubtle rounded-lg"
                        onClick={() => markAsRead(n.id)}
                        title="Mark as read"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      onClick={() => deleteNotification(n.id)}
                      title="Delete notification"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
