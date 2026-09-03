/**
 * useClassroomRecorder Hook
 * 
 * Captures Whiteboard, Screen Share, Teacher Camera, and Audio at 360p low-bitrate.
 * Mixes microphone audio and tab/system audio into a single track.
 * Automatically prepares and uploads recorded class video to the server.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { recordingApi } from '@/services/api';
import { toast } from 'sonner';

export interface UseClassroomRecorderOptions {
  sessionId: number;
  onRecordingComplete?: (blob: Blob, durationSeconds: number) => void;
  autoUpload?: boolean;
}

export function useClassroomRecorder({
  sessionId,
  onRecordingComplete,
  autoUpload = true,
}: UseClassroomRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Format seconds into HH:MM:SS
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Upload recording to backend
  const uploadRecording = useCallback(
    async (blobToUpload?: Blob, durationSec?: number) => {
      const blob = blobToUpload || recordedBlob;
      const duration = durationSec !== undefined ? durationSec : recordingDuration;

      if (!blob || !sessionId) {
        return false;
      }

      setIsUploading(true);
      setUploadProgress(0);

      try {
        const formData = new FormData();
        const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
        const file = new File([blob], `recording_session_${sessionId}.${extension}`, {
          type: blob.type || 'video/webm',
        });

        formData.append('video', file);
        formData.append('duration_seconds', String(Math.round(duration)));

        await recordingApi.upload(sessionId, formData, (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        });

        toast.success('Class recording uploaded and saved! (Kept for 30 days)');
        return true;
      } catch (error: any) {
        console.error('Failed to upload recording:', error);
        toast.error(error?.response?.data?.message || 'Failed to upload class recording');
        return false;
      } finally {
        setIsUploading(false);
      }
    },
    [recordedBlob, sessionId, recordingDuration]
  );

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    setRecordingDuration(duration);

    return new Promise<Blob | null>((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) {
        resolve(null);
        return;
      }

      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        setIsRecording(false);

        // Stop all tracks to release hardware resources
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
        }

        if (onRecordingComplete) {
          onRecordingComplete(blob, duration);
        }

        if (autoUpload && blob.size > 0) {
          await uploadRecording(blob, duration);
        }

        resolve(blob);
      };

      recorder.stop();
    });
  }, [autoUpload, onRecordingComplete, uploadRecording]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // 1. Capture Screen / Browser Tab / Whiteboard (with audio if user chooses entire screen/tab)
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 640, max: 854 },
          height: { ideal: 360, max: 480 },
          frameRate: { ideal: 15, max: 20 },
        },
        audio: true, // Captures tab/system sound
      });

      // 2. Capture Microphone Audio (Teacher's Voice)
      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
      } catch (err) {
        console.warn('Microphone capture not available or denied, recording screen audio only');
      }

      // 3. Mix audio sources using Web Audio API
      const tracksToRecord: MediaStreamTrack[] = [];
      const videoTrack = displayStream.getVideoTracks()[0];
      if (videoTrack) {
        tracksToRecord.push(videoTrack);
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass && (displayStream.getAudioTracks().length > 0 || micStream)) {
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;
        const dest = audioCtx.createMediaStreamDestination();

        if (displayStream.getAudioTracks().length > 0) {
          const sysSource = audioCtx.createMediaStreamSource(
            new MediaStream([displayStream.getAudioTracks()[0]])
          );
          sysSource.connect(dest);
        }

        if (micStream && micStream.getAudioTracks().length > 0) {
          const micSource = audioCtx.createMediaStreamSource(micStream);
          micSource.connect(dest);
        }

        const mixedAudioTrack = dest.stream.getAudioTracks()[0];
        if (mixedAudioTrack) {
          tracksToRecord.push(mixedAudioTrack);
        }
      } else if (micStream && micStream.getAudioTracks().length > 0) {
        tracksToRecord.push(micStream.getAudioTracks()[0]);
      }

      const combinedStream = new MediaStream(tracksToRecord);
      streamRef.current = combinedStream;

      // Handle user stopping screen share from browser banner
      videoTrack.onended = () => {
        if (isRecording) {
          stopRecording();
        }
      };

      // 4. Select supported mimeType (VP8/Opus or MP4)
      const mimeTypes = [
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/webm',
        'video/mp4',
      ];
      const selectedMimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';

      // 5. Initialize MediaRecorder with 360p bitrate (~350 kbps)
      const recorder = new MediaRecorder(combinedStream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 350000, // ~350 kbps (low bitrate 360p)
        audioBitsPerSecond: 48000,  // 48 kbps voice
      });

      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      // Request data chunks every 2 seconds
      recorder.start(2000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);
      startTimeRef.current = Date.now();

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        const secs = Math.round((Date.now() - startTimeRef.current) / 1000);
        setRecordingDuration(secs);
      }, 1000);

      toast.success('Recording started in 360p! Whiteboard & screen share are being captured.');
      return true;
    } catch (error: any) {
      console.error('Failed to start classroom recording:', error);
      if (error.name !== 'NotAllowedError') {
        toast.error('Failed to start recording: ' + (error.message || 'Permission denied'));
      }
      return false;
    }
  }, [isRecording, stopRecording]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  return {
    isRecording,
    recordingDuration,
    formattedDuration: formatDuration(recordingDuration),
    isUploading,
    uploadProgress,
    recordedBlob,
    startRecording,
    stopRecording,
    uploadRecording,
  };
}
