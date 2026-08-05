/**
 * useBackgroundProcessor Hook
 * 
 * Processes video stream to replace background with solid gray color.
 * Uses Canvas-based processing with MediaPipe Selfie Segmentation.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

const BACKGROUND_COLOR = [255, 255, 255]; // RGB for white

interface UseBackgroundProcessorReturn {
    isBackgroundActive: boolean;
    toggleBackground: () => void;
    getProcessedStream: (inputStream: MediaStream) => MediaStream | null;
}

export function useBackgroundProcessor(): UseBackgroundProcessorReturn {
    const [isBackgroundActive, setIsBackgroundActive] = useState(false);

    // Use ref to avoid stale closure in animation loop
    const isBackgroundActiveRef = useRef(false);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const outputStreamRef = useRef<MediaStream | null>(null);
    const selfieSegmentationRef = useRef<unknown>(null);
    const isModelLoadedRef = useRef(false);
    const isInitializedRef = useRef(false);

    // Keep ref in sync with state
    useEffect(() => {
        isBackgroundActiveRef.current = isBackgroundActive;
        console.log('[BackgroundProcessor] Background active:', isBackgroundActive);
    }, [isBackgroundActive]);

    // Load MediaPipe Selfie Segmentation
    const loadMediaPipe = useCallback(async () => {
        if (isModelLoadedRef.current) return;

        try {
            console.log('[BackgroundProcessor] Loading MediaPipe...');

            // Load MediaPipe Selfie Segmentation from CDN
            if (!(window as unknown as Record<string, unknown>).SelfieSegmentation) {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';
                script.async = true;

                await new Promise<void>((resolve, reject) => {
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error('Failed to load MediaPipe'));
                    document.head.appendChild(script);
                });
            }

            const SelfieSegmentationClass = (window as unknown as Record<string, unknown>).SelfieSegmentation as new (config: { locateFile: (file: string) => string }) => {
                setOptions: (opts: { modelSelection: number; selfieMode: boolean }) => void;
                onResults: (callback: (results: { segmentationMask: CanvasImageSource; image: CanvasImageSource }) => void) => void;
                initialize: () => Promise<void>;
                send: (opts: { image: HTMLVideoElement }) => Promise<void>;
                close: () => void;
            };

            const selfieSegmentation = new SelfieSegmentationClass({
                locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
            });

            selfieSegmentation.setOptions({
                modelSelection: 1,
                selfieMode: true,
            });

            selfieSegmentation.onResults((results) => {
                if (!ctxRef.current || !canvasRef.current) return;
                const ctx = ctxRef.current;
                const canvas = canvasRef.current;

                ctx.save();
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Draw segmentation mask
                ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);

                // Fill background with gray where mask is not present
                ctx.globalCompositeOperation = 'source-out';
                ctx.fillStyle = `rgb(${BACKGROUND_COLOR.join(',')})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw foreground (person)
                ctx.globalCompositeOperation = 'destination-atop';
                ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

                ctx.restore();
            });

            await selfieSegmentation.initialize();
            selfieSegmentationRef.current = selfieSegmentation;
            isModelLoadedRef.current = true;
            console.log('[BackgroundProcessor] MediaPipe Selfie Segmentation loaded successfully!');
        } catch (error) {
            console.warn('[BackgroundProcessor] MediaPipe failed to load:', error);
            isModelLoadedRef.current = false;
        }
    }, []);

    // Process frame - uses refs to get current state
    const processFrame = useCallback(() => {
        if (!ctxRef.current || !canvasRef.current || !videoRef.current) {
            animationFrameRef.current = requestAnimationFrame(processFrame);
            return;
        }

        const video = videoRef.current;
        const ctx = ctxRef.current;
        const canvas = canvasRef.current;

        if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            animationFrameRef.current = requestAnimationFrame(processFrame);
            return;
        }

        // Keep canvas size in sync with actual video dimensions to prevent
        // stretch/distortion when camera resolution changes (e.g. mobile rotation)
        if (video.videoWidth && video.videoHeight &&
            (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            console.log('[BackgroundProcessor] Canvas resized to match video:', canvas.width, 'x', canvas.height);
        }

        // Check if background processing is active using ref (not stale state)
        if (isBackgroundActiveRef.current && isModelLoadedRef.current && selfieSegmentationRef.current) {
            // Use MediaPipe for segmentation
            const segmentation = selfieSegmentationRef.current as { send: (opts: { image: HTMLVideoElement }) => Promise<void> };
            segmentation.send({ image: video }).catch(console.error);
        } else {
            // Just draw the original video
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        animationFrameRef.current = requestAnimationFrame(processFrame);
    }, []);

    // Initialize elements
    const initElements = useCallback((inputStream: MediaStream) => {
        if (isInitializedRef.current) return;

        console.log('[BackgroundProcessor] Initializing elements...');

        // Create hidden video element for input
        if (!videoRef.current) {
            const video = document.createElement('video');
            video.autoplay = true;
            video.playsInline = true;
            video.muted = true;
            video.srcObject = inputStream;
            videoRef.current = video;
            video.play().catch(console.error);
        }

        // Create canvas for output
        if (!canvasRef.current) {
            canvasRef.current = document.createElement('canvas');
            ctxRef.current = canvasRef.current.getContext('2d', { willReadFrequently: true });
        }

        // Setup video dimensions
        const videoTrack = inputStream.getVideoTracks()[0];
        if (videoTrack && canvasRef.current) {
            const settings = videoTrack.getSettings();
            canvasRef.current.width = settings.width || 640;
            canvasRef.current.height = settings.height || 480;
            console.log('[BackgroundProcessor] Canvas size:', canvasRef.current.width, 'x', canvasRef.current.height);
        }

        isInitializedRef.current = true;
    }, []);

    // Get processed stream from input stream
    const getProcessedStream = useCallback((inputStream: MediaStream): MediaStream | null => {
        console.log('[BackgroundProcessor] Creating processed stream...');

        initElements(inputStream);

        if (!canvasRef.current) {
            console.error('[BackgroundProcessor] Canvas not created!');
            return null;
        }

        // Start loading MediaPipe in background
        loadMediaPipe();

        // Create output stream from canvas
        const outputStream = canvasRef.current.captureStream(30);

        // Add audio tracks from original stream
        inputStream.getAudioTracks().forEach(track => {
            outputStream.addTrack(track);
        });

        outputStreamRef.current = outputStream;

        // Start processing loop
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        console.log('[BackgroundProcessor] Starting processing loop...');
        animationFrameRef.current = requestAnimationFrame(processFrame);

        return outputStream;
    }, [initElements, loadMediaPipe, processFrame]);

    // Toggle background replacement
    const toggleBackground = useCallback(() => {
        setIsBackgroundActive(prev => {
            const newValue = !prev;
            console.log('[BackgroundProcessor] Toggle background:', newValue);
            return newValue;
        });
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (selfieSegmentationRef.current) {
                const segmentation = selfieSegmentationRef.current as { close: () => void };
                segmentation.close();
            }
        };
    }, []);

    return {
        isBackgroundActive,
        toggleBackground,
        getProcessedStream,
    };
}
