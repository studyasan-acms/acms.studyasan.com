import { useEffect, useRef, useCallback } from 'react';

// ============================================================================
// Clean, Uncopyrighted Sound Engine for Educational Activities & Games
// Uses high-quality CC0 audio assets from Kenney.nl (no harsh procedural buzzes)
// ============================================================================

interface PlaySoundOptions {
  loop?: boolean;
  volume?: number;
  variation?: number;
}

const SOUND_POOLS: Record<string, string[]> = {
  correct: [
    '/sounds/confirmation_001.wav',
    '/sounds/confirmation_002.wav',
    '/sounds/confirmation_003.wav',
    '/sounds/confirmation_004.wav',
  ],
  incorrect: [
    '/sounds/error_001.wav',
    '/sounds/error_002.wav',
    '/sounds/error_003.wav',
  ],
  click: [
    '/sounds/click_001.wav',
    '/sounds/click_002.wav',
    '/sounds/click_003.wav',
  ],
  'timer-tick': [
    '/sounds/tick_001.wav',
    '/sounds/tick_002.wav',
  ],
  'game-over': [
    '/sounds/victory_001.ogg',
    '/sounds/victory_002.ogg',
    '/sounds/victory_003.ogg',
    '/sounds/victory_004.ogg',
  ],
  'bg-music': [
    '/sounds/bg-music.mp3',
  ],
  'bg-music-zen': [
    '/sounds/bg-music-zen.mp3',
  ],
  'bg-music-playful': [
    '/sounds/bg-music-playful.mp3',
  ],
};

// Gentle default master multipliers to ensure audio is soothing and clear
const DEFAULT_VOLUME_MULTIPLIERS: Record<string, number> = {
  correct: 0.35,
  incorrect: 0.28,
  click: 0.24,
  'timer-tick': 0.22,
  'game-over': 0.38,
  'bg-music': 0.42,
  'bg-music-zen': 0.40,
  'bg-music-playful': 0.40,
};

// Track last-played index per sound key to avoid repeating the exact same file consecutively
const lastSoundIndices: Record<string, number> = {};

const pickSoundUrl = (soundName: string, forceIndex?: number): string => {
  const pool = SOUND_POOLS[soundName];
  if (!pool || pool.length === 0) {
    // Fallback for custom or direct sound names
    return soundName.startsWith('/') || soundName.startsWith('http')
      ? soundName
      : `/sounds/${soundName}.mp3`;
  }

  if (forceIndex !== undefined && forceIndex >= 0 && forceIndex < pool.length) {
    lastSoundIndices[soundName] = forceIndex;
    return pool[forceIndex];
  }

  if (pool.length === 1) {
    return pool[0];
  }

  const last = lastSoundIndices[soundName] ?? -1;
  let next = Math.floor(Math.random() * pool.length);
  if (next === last) {
    next = (next + 1) % pool.length;
  }
  lastSoundIndices[soundName] = next;
  return pool[next];
};

export const useSound = () => {
  // Store persistent audio instances for looping/controlled sounds (like bg-music)
  const controlledAudioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const playSound = useCallback((soundName: string, options: PlaySoundOptions = {}) => {
    const { loop = false, volume, variation } = options;

    try {
      const url = pickSoundUrl(soundName, variation);
      const defaultMultiplier = DEFAULT_VOLUME_MULTIPLIERS[soundName] ?? 0.35;
      const effectiveVolume = Math.min(1, Math.max(0, (volume ?? 1) * defaultMultiplier));

      if (loop) {
        // For looping audio (e.g. background music), keep a stable instance
        let audio = controlledAudioRefs.current[soundName];
        if (!audio) {
          audio = new Audio(url);
          audio.loop = true;
          controlledAudioRefs.current[soundName] = audio;
        } else if (audio.src !== window.location.origin + url && !audio.src.endsWith(url)) {
          audio.src = url;
        }

        audio.volume = effectiveVolume;
        audio.currentTime = 0;
        audio.play().catch(() => {
          // Autoplay policy or muted tab, gracefully handle
        });
      } else {
        // For one-shot sound effects, create a lightweight Audio instance for zero-latency overlap
        const sfx = new Audio(url);
        sfx.volume = effectiveVolume;
        sfx.play().catch(() => {
          // Gracefully ignore browser autoplay restrictions before user gesture
        });
      }
    } catch (err) {
      console.warn(`Sound playback error for ${soundName}:`, err);
    }
  }, []);

  const stopSound = useCallback((soundName: string) => {
    const audio = controlledAudioRefs.current[soundName];
    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // ignore
      }
    }
  }, []);

  const stopAll = useCallback(() => {
    Object.values(controlledAudioRefs.current).forEach((audio) => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // ignore
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  return { playSound, stopSound, stopAll };
};

export default useSound;
