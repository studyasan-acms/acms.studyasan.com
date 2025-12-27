import { useEffect } from "react";
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

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

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
          "fixed top-16 right-0 h-[calc(100vh-4rem)] w-full sm:w-96",
          "bg-white shadow-xl border-l rounded-tl-2xl",
          "transform transition-transform duration-300 ease-in-out z-50",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-gray-50 rounded-tl-2xl">
          <h2 className="text-lg font-semibold text-saBlue">Notifications</h2>

          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.is_read) && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-gray-700"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-saBlue" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
              <Info className="h-8 w-8 mb-2" />
              <p>No notifications</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "p-4 rounded-xl shadow-sm bg-white border transition-all",
                  "hover:shadow-md hover:bg-gray-50",
                  !n.is_read && "border-saBlueLight/40 bg-saBlueLight/20"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="mt-1">{getIcon(n.type)}</div>

                  {/* Text */}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {n.title}
                    </p>

                    {n.description && (
                      <p className="text-sm text-gray-600">{n.description}</p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={getBadge(n.type)}>{n.type}</Badge>
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {!n.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-saBlue"
                        onClick={() => markAsRead(n.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-saVividOrange hover:text-saVividOrange/90"
                      onClick={() => deleteNotification(n.id)}
                    >
                      <Trash2 className="h-4 w-4" />
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
