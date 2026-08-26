import { RefObject, useEffect } from "react";

const PLAY_RETRY_DELAYS_MS = [0, 400, 1_000] as const;

export function useAutoplayVideo(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean
): void {
  useEffect(() => {
    if (!enabled) return;

    const play = () => {
      const video = videoRef.current;
      if (!video) return;
      video.muted = true;
      video.playsInline = true;
      void video.play().catch(() => undefined);
    };

    const timers = PLAY_RETRY_DELAYS_MS.map((delay) =>
      window.setTimeout(play, delay)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [enabled, videoRef]);
}
