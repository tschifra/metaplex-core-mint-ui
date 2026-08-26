// Custom hook for confetti celebration
// Manages confetti state with auto-dismiss

import { useState, useEffect, useCallback } from 'react';

interface UseConfettiOptions {
  duration?: number; // How long to show confetti (ms)
  autoTrigger?: boolean; // Whether to trigger automatically on mount
}

interface UseConfettiReturn {
  showConfetti: boolean;
  triggerConfetti: () => void;
  stopConfetti: () => void;
}

export const useConfetti = (options: UseConfettiOptions = {}): UseConfettiReturn => {
  const { duration = 5000, autoTrigger = false } = options;
  const [showConfetti, setShowConfetti] = useState(autoTrigger);

  const triggerConfetti = useCallback(() => {
    setShowConfetti(true);
  }, []);

  const stopConfetti = useCallback(() => {
    setShowConfetti(false);
  }, []);

  // Auto-dismiss confetti after duration
  useEffect(() => {
    if (showConfetti && duration > 0) {
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [showConfetti, duration]);

  return {
    showConfetti,
    triggerConfetti,
    stopConfetti,
  };
};

export default useConfetti;
