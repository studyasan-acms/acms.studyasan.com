import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export interface AudioOutputDevice {
    deviceId: string;
    label: string;
    groupId?: string;
    isDefault?: boolean;
    isEarpiece?: boolean;
    isSpeaker?: boolean;
}

export interface UseAudioOutputReturn {
    isAudioClosed: boolean;
    selectedDeviceId: string;
    audioDevices: AudioOutputDevice[];
    isSinkIdSupported: boolean;
    currentMode: 'speaker' | 'earpiece' | 'custom';
    toggleAudioClosed: () => void;
    setAudioClosed: (closed: boolean) => void;
    setAudioOutputDevice: (deviceId: string) => Promise<void>;
    switchToSpeaker: () => Promise<void>;
    switchToEarpiece: () => Promise<void>;
    openSystemAudioPicker: () => Promise<void>;
    applyToMediaElement: (element: HTMLMediaElement | null, isLocal?: boolean) => void;
}

export function useAudioOutput(): UseAudioOutputReturn {
    const [isAudioClosed, setIsAudioClosedState] = useState<boolean>(false);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');
    const [audioDevices, setAudioDevices] = useState<AudioOutputDevice[]>([]);
    const [currentMode, setCurrentMode] = useState<'speaker' | 'earpiece' | 'custom'>('speaker');

    const isSinkIdSupported = typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;
    const registeredMediaElements = useRef<Set<HTMLMediaElement>>(new Set());

    // Helper to refresh available audio output devices
    const refreshDevices = useCallback(async () => {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
            return;
        }

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const outputs = devices.filter((d) => d.kind === 'audiooutput');

            const formatted: AudioOutputDevice[] = outputs.map((d, index) => {
                const label = d.label || (d.deviceId === 'default' ? 'Default Speaker / Audio' : `Audio Device ${index + 1}`);
                const lower = label.toLowerCase();
                const isEarpiece = lower.includes('earpiece') || lower.includes('headphone') || lower.includes('headset') || lower.includes('earphone') || lower.includes('handsfree') || lower.includes('airpods') || lower.includes('buds');
                const isSpeaker = lower.includes('speaker') || lower.includes('built-in') || d.deviceId === 'default';

                return {
                    deviceId: d.deviceId,
                    label: d.deviceId === 'default' && !label.toLowerCase().includes('default') ? `Default (${label})` : label,
                    groupId: d.groupId,
                    isDefault: d.deviceId === 'default',
                    isEarpiece,
                    isSpeaker,
                };
            });

            // If no specific devices were enumerated (e.g. permission or platform limitation), provide standard presets
            if (formatted.length === 0) {
                formatted.push(
                    { deviceId: 'default', label: 'Speaker (Default)', isDefault: true, isSpeaker: true },
                    { deviceId: 'earpiece', label: 'Earpiece / Headphones', isEarpiece: true }
                );
            }

            setAudioDevices(formatted);
        } catch (err) {
            console.warn('[useAudioOutput] Could not enumerate audio output devices:', err);
        }
    }, []);

    useEffect(() => {
        refreshDevices();

        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
            const handler = () => refreshDevices();
            navigator.mediaDevices.addEventListener('devicechange', handler);
            return () => {
                navigator.mediaDevices.removeEventListener('devicechange', handler);
            };
        }
    }, [refreshDevices]);

    // Apply audio state (sinkId & muted) to a media element
    const applyToMediaElement = useCallback((element: HTMLMediaElement | null, isLocal: boolean = false) => {
        if (!element) return;
        registeredMediaElements.current.add(element);

        // Mute handling
        if (isLocal) {
            element.muted = true;
        } else {
            element.muted = isAudioClosed;
        }

        // SinkId handling
        if (isSinkIdSupported && selectedDeviceId && selectedDeviceId !== 'earpiece' && (element as any).setSinkId) {
            const targetSinkId = selectedDeviceId === 'default' ? '' : selectedDeviceId;
            if ((element as any).sinkId !== targetSinkId) {
                (element as any).setSinkId(targetSinkId).catch((err: any) => {
                    console.warn('[useAudioOutput] setSinkId error:', err);
                });
            }
        }
    }, [isAudioClosed, selectedDeviceId, isSinkIdSupported]);

    // Update all registered media elements and all DOM media elements
    const syncAllElements = useCallback((closed: boolean, deviceId: string) => {
        const targetSinkId = deviceId === 'default' || deviceId === 'speaker' || deviceId === 'earpiece' ? '' : deviceId;

        // Sync registered elements
        registeredMediaElements.current.forEach((el) => {
            if (el && document.body.contains(el)) {
                if (el.getAttribute('data-is-local') !== 'true') {
                    el.muted = closed;
                    el.volume = closed ? 0 : 1;
                }
                if (isSinkIdSupported && (el as any).setSinkId) {
                    (el as any).setSinkId(targetSinkId).catch(() => {});
                }
            } else {
                registeredMediaElements.current.delete(el);
            }
        });

        // Also broadcast to any video/audio in document
        const allAudio = document.querySelectorAll<HTMLAudioElement>('audio');
        allAudio.forEach((el) => {
            el.muted = closed;
            el.volume = closed ? 0 : 1;
            if (isSinkIdSupported && (el as any).setSinkId) {
                (el as any).setSinkId(targetSinkId).catch(() => {});
            }
        });

        const allVideo = document.querySelectorAll<HTMLVideoElement>('video');
        allVideo.forEach((el) => {
            if (el.getAttribute('data-is-local') !== 'true') {
                el.muted = closed;
                el.volume = closed ? 0 : 1;
            }
            if (isSinkIdSupported && (el as any).setSinkId) {
                (el as any).setSinkId(targetSinkId).catch(() => {});
            }
        });
    }, [isSinkIdSupported]);

    // Toggle close/open sound
    const toggleAudioClosed = useCallback(() => {
        setIsAudioClosedState((prev) => {
            const next = !prev;
            syncAllElements(next, selectedDeviceId);
            if (next) {
                toast.info('Sound closed (all incoming audio muted)');
            } else {
                toast.success('Sound opened (incoming audio active)');
            }
            return next;
        });
    }, [selectedDeviceId, syncAllElements]);

    const setAudioClosed = useCallback((closed: boolean) => {
        setIsAudioClosedState(closed);
        syncAllElements(closed, selectedDeviceId);
    }, [selectedDeviceId, syncAllElements]);

    // Set audio output device
    const setAudioOutputDevice = useCallback(async (deviceId: string) => {
        setSelectedDeviceId(deviceId);

        const targetDevice = audioDevices.find((d) => d.deviceId === deviceId);
        const label = targetDevice?.label || deviceId;

        if (targetDevice?.isEarpiece || deviceId === 'earpiece') {
            setCurrentMode('earpiece');
        } else if (targetDevice?.isSpeaker || deviceId === 'default' || deviceId === 'speaker') {
            setCurrentMode('speaker');
        } else {
            setCurrentMode('custom');
        }

        syncAllElements(isAudioClosed, deviceId);
        toast.success(`Audio output: ${label}`);
    }, [audioDevices, isAudioClosed, syncAllElements]);

    // Quick switch to Speaker
    const switchToSpeaker = useCallback(async () => {
        const speakerDev = audioDevices.find((d) => d.isSpeaker || d.isDefault) || audioDevices[0];
        const devId = speakerDev ? speakerDev.deviceId : 'default';
        setSelectedDeviceId(devId);
        setCurrentMode('speaker');
        syncAllElements(isAudioClosed, devId);
        toast.success('Switched to Speaker 🔊');
    }, [audioDevices, isAudioClosed, syncAllElements]);

    // Quick switch to Earpiece / Headphones
    const switchToEarpiece = useCallback(async () => {
        const earpieceDev = audioDevices.find((d) => d.isEarpiece && !d.isDefault);
        const devId = earpieceDev ? earpieceDev.deviceId : 'earpiece';
        setSelectedDeviceId(devId);
        setCurrentMode('earpiece');
        syncAllElements(isAudioClosed, devId);
        toast.success('Switched to Earpiece / Headphones 🎧');
    }, [audioDevices, isAudioClosed, syncAllElements]);

    // Native browser audio output picker if supported (Chrome/Edge)
    const openSystemAudioPicker = useCallback(async () => {
        if (typeof navigator !== 'undefined' && (navigator.mediaDevices as any)?.selectAudioOutput) {
            try {
                const device = await (navigator.mediaDevices as any).selectAudioOutput();
                if (device?.deviceId) {
                    await setAudioOutputDevice(device.deviceId);
                    await refreshDevices();
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.warn('[useAudioOutput] selectAudioOutput error:', err);
                }
            }
        } else {
            toast.info('System audio picker not supported on this browser. Select from list above.');
        }
    }, [setAudioOutputDevice, refreshDevices]);

    return {
        isAudioClosed,
        selectedDeviceId,
        audioDevices,
        isSinkIdSupported,
        currentMode,
        toggleAudioClosed,
        setAudioClosed,
        setAudioOutputDevice,
        switchToSpeaker,
        switchToEarpiece,
        openSystemAudioPicker,
        applyToMediaElement,
    };
}
