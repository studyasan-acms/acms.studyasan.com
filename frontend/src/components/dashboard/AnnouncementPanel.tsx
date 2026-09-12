import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Megaphone, X, Clock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { announcementService } from "@/services/api";
import { useNavigate } from "react-router-dom";
import { getAnnouncementTypeConfig } from "@/utils/announcementUtils";
import { useAuthStore } from "@/store/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import type { Announcement } from "@/types";

interface AnnouncementPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AnnouncementPanel({
  isOpen,
  onClose,
}: AnnouncementPanelProps) {
  const { user } = useAuthStore();
  const { permissions } = usePermissions();
  const canManage =
    user?.role === 'ADMIN' ||
    (user?.role === 'TEACHER' && permissions.announcements?.manage);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      fetchAnnouncements();
    }
  }, [isOpen]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await announcementService.getAnnouncements();
      setAnnouncements(res.data?.announcements || []);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAll = () => {
    navigate("/dashboard/announcements");
    onClose();
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
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 text-white">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Announcements</h2>
                {announcements.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-saVividOrange text-white">
                    {announcements.length}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/80">Notices, events & broadcast updates</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20 rounded-xl"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="animate-spin h-8 w-8 rounded-full border-2 border-saBlue border-t-transparent" />
              <p className="text-xs text-slate-400 font-medium">Fetching announcements...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center mb-3 shadow-xs">
                <Megaphone className="h-6 w-6 text-saBlue" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No Announcements Right Now</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                You're completely up to date! Check back later for news and alerts.
              </p>
            </div>
          ) : (
            announcements.map((a) => {
              const config = getAnnouncementTypeConfig(a.type);
              const Icon = config.icon;

              return (
                <div
                  key={a.id}
                  onClick={handleViewAll}
                  className={cn(
                    "p-3.5 rounded-2xl shadow-xs bg-white border transition-all cursor-pointer",
                    "hover:shadow-md hover:border-saBlue/40 border-l-4 group",
                    config.borderLeftClass
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1.5", config.badgeClass)}>
                        <Icon className="w-3 h-3" />
                        <span>{config.label}</span>
                      </span>

                      <span className="text-[10px] text-slate-400 flex items-center gap-1 whitespace-nowrap font-medium">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-tight group-hover:text-saBlue transition-colors">
                      {a.title}
                    </h3>

                    {a.image_url && (
                      <div className="rounded-xl overflow-hidden max-h-36 border border-slate-100 bg-slate-50">
                        <img
                          src={a.image_url}
                          alt={a.title}
                          className="w-full h-full object-cover max-h-36"
                        />
                      </div>
                    )}
                    
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {a.content}
                    </p>

                    <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100">
                      {canManage ? (
                        <span className="font-semibold text-slate-500">By {a.creator?.name || 'Admin'}</span>
                      ) : (
                        <span className="text-slate-400">Official Notice</span>
                      )}
                      <span className="text-saBlue font-bold group-hover:underline">View announcement →</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-200/80 bg-white">
          <Button 
            className="w-full bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl h-10 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xs"
            onClick={handleViewAll}
          >
            <ExternalLink className="h-4 w-4" />
            View All Announcements
          </Button>
        </div>
      </div>
    </>
  );
}
