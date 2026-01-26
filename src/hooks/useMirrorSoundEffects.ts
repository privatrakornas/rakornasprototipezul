import { useRef, useCallback, useEffect } from 'react';

interface SoundEffectOptions {
  enabled?: boolean;
  volume?: number;
}

// Simple beep sound generator using Web Audio API
const createBeepSound = (
  audioContext: AudioContext,
  frequency: number = 800,
  duration: number = 0.1,
  volume: number = 0.3
) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};

export const useMirrorSoundEffects = (options: SoundEffectOptions = {}) => {
  const { enabled = true, volume = 0.3 } = options;
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastAnswerCountRef = useRef<number>(0);
  const lastQuestionIndexRef = useRef<number>(0);

  // Initialize audio context on first user interaction
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Play answer sound (short high beep)
  const playAnswerSound = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = initAudioContext();
      createBeepSound(ctx, 880, 0.08, volume); // A5 note, short
    } catch (e) {
      console.log('[SoundEffects] Could not play answer sound:', e);
    }
  }, [enabled, volume, initAudioContext]);

  // Play navigation sound (lower beep)
  const playNavigationSound = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = initAudioContext();
      createBeepSound(ctx, 440, 0.06, volume * 0.7); // A4 note, quieter
    } catch (e) {
      console.log('[SoundEffects] Could not play navigation sound:', e);
    }
  }, [enabled, volume, initAudioContext]);

  // Check for answer changes and play sound
  const checkAnswerChange = useCallback((currentAnswerCount: number) => {
    if (!enabled) return;
    
    if (currentAnswerCount > lastAnswerCountRef.current) {
      playAnswerSound();
    }
    lastAnswerCountRef.current = currentAnswerCount;
  }, [enabled, playAnswerSound]);

  // Check for navigation changes and play sound
  const checkNavigationChange = useCallback((currentQuestionIndex: number) => {
    if (!enabled) return;
    
    if (currentQuestionIndex !== lastQuestionIndexRef.current) {
      playNavigationSound();
    }
    lastQuestionIndexRef.current = currentQuestionIndex;
  }, [enabled, playNavigationSound]);

  // Reset tracking refs
  const reset = useCallback(() => {
    lastAnswerCountRef.current = 0;
    lastQuestionIndexRef.current = 0;
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  return {
    playAnswerSound,
    playNavigationSound,
    checkAnswerChange,
    checkNavigationChange,
    reset,
    initAudioContext,
  };
};

export default useMirrorSoundEffects;
