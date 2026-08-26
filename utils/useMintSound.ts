import { useEffect, useRef } from 'react';

type WindowWithWebKitAudio = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

const createAudioContext = (): AudioContext | null => {
  const AudioContextConstructor = window.AudioContext ||
    (window as WindowWithWebKitAudio).webkitAudioContext;
  return AudioContextConstructor ? new AudioContextConstructor() : null;
};

export const useMintSound = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create a simple success sound using Web Audio API
    // This avoids needing external sound files
    audioRef.current = new Audio();
  }, []);

  const playSuccess = () => {
    try {
      // Create AudioContext
      const audioContext = createAudioContext();
      if (!audioContext) return;

      // Create oscillators for a pleasant "success" sound
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configure frequencies for a pleasing chord
      oscillator1.frequency.value = 523.25; // C5
      oscillator2.frequency.value = 659.25; // E5

      oscillator1.type = 'sine';
      oscillator2.type = 'sine';

      // Envelope for smooth sound
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator1.start(audioContext.currentTime);
      oscillator2.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 0.5);
      oscillator2.stop(audioContext.currentTime + 0.5);
    } catch {
      // Audio not available - silent fail is acceptable for optional sound
    }
  };

  const playCoinSound = () => {
    try {
      const audioContext = createAudioContext();
      if (!audioContext) return;

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Higher frequency for "coin" sound
      oscillator.frequency.value = 800;
      oscillator.type = 'square';

      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {
      // Audio not available - silent fail is acceptable for optional sound
    }
  };

  return { playSuccess, playCoinSound };
};
