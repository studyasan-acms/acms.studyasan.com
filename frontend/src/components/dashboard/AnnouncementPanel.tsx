import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Megaphone, X, Clock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { announcementService } from "@/services/api";
import { useNavigate } from "react-router-dom";
import { getAnnouncementTypeConfig } from "@/utils/announcementUtils";
import type { Announcement } from "@/types";

interface AnnouncementPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AnnouncementPanel({
  isOpen,
  onClose,
}: AnnouncementPanelProps) {
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
          "bg-white shadow-xl border-l rounded-tl-2xl flex flex-col",
          "transform transition-transform duration-300 ease-in-out z-50",
          "will-change-transform",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-gray-50 rounded-tl-2xl">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-saBlue" />
            <h2 className="text-lg font-semibold text-saBlue">Announcements</h2>
          </div>

          <div className="flex items-center gap-2">
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
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-saBlue" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500 text-center">
              <Megaphone className="h-8 w-8 mb-2 opacity-20" />
              <p>No announcements found</p>
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
                    "p-4 rounded-xl shadow-xs bg-white border transition-all cursor-pointer",
                    "hover:shadow-md hover:bg-slate-50/80 border-l-4",
                    config.borderLeftClass
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1.5", config.badgeClass)}>
                        <Icon className="w-3 h-3" />
                        <span>{config.label}</span>
                      </span>

                      <span className="text-[10px] text-gray-400 flex items-center gap-1 whitespace-nowrap">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-gray-900 leading-tight">
                      {a.title}
                    </h3>
                    
                    <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                      {a.content}
                    </p>

                    <div className="pt-2 flex items-center gap-2 text-[10px] text-gray-400 border-t border-slate-100">
                      <span className="font-medium text-gray-500">By {a.creator?.name || 'Admin'}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <Button 
            className="w-full bg-saBlue hover:bg-saBlueDark"
            onClick={handleViewAll}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View All Announcements
          </Button>
        </div>
      </div>
    </>
  );
}
