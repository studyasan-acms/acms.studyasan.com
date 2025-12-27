import { useEffect, useRef } from 'react';

export const useSound = () => {
    const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

    const playSound = (soundName: string, { loop = false, volume = 0.5 } = {}) => {
        const soundPath = `/sounds/${soundName}.mp3`;

        // Create new audio instance if it doesn't exist
        if (!audioRefs.current[soundName]) {
            const audio = new Audio(soundPath);
            audio.volume = volume;
            audio.loop = loop;
            audioRefs.current[soundName] = audio;
        }

        const audio = audioRefs.current[soundName];

        // Reset and play
        audio.currentTime = 0;
        audio.play().catch(err => {
            console.warn(`Audio playback failed for ${soundName}:`, err);
        });
    };

    const stopSound = (soundName: string) => {
        const audio = audioRefs.current[soundName];
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    };

    const stopAll = () => {
        Object.values(audioRefs.current).forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
    };

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            stopAll();
        };
    }, []);

    return { playSound, stopSound, stopAll };
};
