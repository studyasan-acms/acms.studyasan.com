import React from 'react';

interface RecordingControlsProps {
  isTeacher?: boolean;
  isRecording?: boolean;
  formattedDuration?: string;
  isUploading?: boolean;
  uploadProgress?: number;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
}

/**
 * Universal Recording Indicator
 * Shows for Teachers, Admins, and Students that the class is being automatically recorded.
 * No timer, no 360p text, no stop button (recording is controlled automatically by server).
 */
export const RecordingControls: React.FC<RecordingControlsProps> = () => {
  return (
    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/20 border border-red-400/40 text-red-100 text-xs font-semibold shadow-sm backdrop-blur-md animate-in fade-in duration-300">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
      </span>
      <span className="tracking-wide">This class is being recorded</span>
    </div>
  );
};
