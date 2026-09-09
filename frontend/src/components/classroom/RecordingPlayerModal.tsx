import React, { useEffect, useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, PlayCircle, Clock, Calendar, AlertCircle, HardDrive, ShieldAlert, Download } from 'lucide-react';
import { recordingApi, type SessionRecordingInfo } from '@/services/api';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface RecordingPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: number;
  sessionTitle?: string;
}

export const RecordingPlayerModal: React.FC<RecordingPlayerModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  sessionTitle,
}) => {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [recordingInfo, setRecordingInfo] = useState<SessionRecordingInfo | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOpen && sessionId) {
      setLoading(true);
      recordingApi
        .getInfo(sessionId)
        .then((res) => {
          if (res.success && res.data) {
            setRecordingInfo(res.data);
          } else {
            setRecordingInfo(null);
          }
        })
        .catch((err) => {
          console.error('Error fetching recording info:', err);
          setRecordingInfo(null);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, sessionId]);

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const streamUrl = `${recordingApi.getStreamUrl(sessionId)}&download=true`;
      const safeTitle = (sessionTitle || `session_${sessionId}`)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .toLowerCase();
      const filename = `${safeTitle}_recording.mp4`;

      const response = await fetch(streamUrl);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Recording download completed');
    } catch (err: any) {
      console.error('Download error:', err);
      // Fallback: direct browser navigation to download URL
      const streamUrl = `${recordingApi.getStreamUrl(sessionId)}&download=true`;
      const a = document.createElement('a');
      a.href = streamUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.info('Initiating recording download...');
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytesStr?: string) => {
    if (!bytesStr) return 'Unknown size';
    const bytes = Number(bytesStr);
    if (isNaN(bytes) || bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1000) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <DialogHeader className="p-5 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <PlayCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-bold text-slate-900 truncate">
                  {sessionTitle ? `${sessionTitle} - Class Recording` : 'Class Session Recording'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Session #{sessionId} • 360p Stream
                </DialogDescription>
              </div>
            </div>
            {recordingInfo?.available && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={downloading}
                onClick={handleDownload}
                className="h-8 px-3 text-xs font-bold rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-1.5 shrink-0 transition-all"
              >
                {downloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>{downloading ? 'Downloading...' : 'Download Video'}</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium">Loading session recording...</p>
            </div>
          ) : !recordingInfo || !recordingInfo.available ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 space-y-3">
              <div className="p-3 rounded-full bg-amber-50 text-amber-600">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-800">
                  {recordingInfo?.status === 'EXPIRED'
                    ? 'Recording Expired'
                    : 'No Recording Available'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  {recordingInfo?.status === 'EXPIRED'
                    ? 'This recording has passed the 30-day retention window and was automatically purged from the server to save disk space.'
                    : 'A recording has not been uploaded for this class session yet.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* HTML5 Video Player with HTTP 206 Streaming */}
              <div className="relative rounded-xl overflow-hidden bg-black shadow-lg aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={recordingApi.getStreamUrl(sessionId)}
                  controls
                  controlsList="nodownload"
                  playsInline
                  className="w-full h-full object-contain"
                  poster="/placeholder-video.jpg"
                >
                  Your browser does not support HTML5 video playback.
                </video>
              </div>

              {/* Playback Controls & Speed */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Playback Speed:</span>
                  <div className="flex items-center gap-1">
                    {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
                      <Button
                        key={speed}
                        type="button"
                        size="sm"
                        variant={playbackSpeed === speed ? 'default' : 'outline'}
                        className={`h-7 px-2 text-[11px] rounded-lg ${
                          playbackSpeed === speed
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                        onClick={() => handleSpeedChange(speed)}
                      >
                        {speed}x
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-600">
                  {recordingInfo.durationSeconds && (
                    <div className="flex items-center gap-1.5" title="Duration">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDuration(recordingInfo.durationSeconds)}</span>
                    </div>
                  )}
                  {recordingInfo.fileSizeBytes && (
                    <div className="flex items-center gap-1.5" title="File Size">
                      <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatFileSize(recordingInfo.fileSizeBytes)}</span>
                    </div>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    disabled={downloading}
                    onClick={handleDownload}
                    className="h-7 px-2.5 text-[11px] font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-xs"
                  >
                    {downloading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>Download</span>
                  </Button>
                </div>
              </div>

              {/* 30-Day Retention Badge & Details */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold">30-Day Server Retention Policy</p>
                  <p className="text-blue-700 leading-relaxed">
                    Recorded on{' '}
                    <span className="font-medium">
                      {recordingInfo.createdAt ? format(new Date(recordingInfo.createdAt), 'dd MMM yyyy, hh:mm a') : 'N/A'}
                    </span>
                    . This recording will be automatically deleted on{' '}
                    <span className="font-bold underline">
                      {recordingInfo.expiresAt ? format(new Date(recordingInfo.expiresAt), 'dd MMM yyyy') : 'in 30 days'}
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
