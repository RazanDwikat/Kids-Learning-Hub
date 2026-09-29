import { useMemo } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { StoryAudioPlayer, StoryAudioStatus } from './storyAudioCore';

export type { StoryAudioPlayer, StoryAudioStatus };

// Native: expo-audio drives real playback; wrapped to the shared contract.
export function useStoryAudio(source: number): { player: StoryAudioPlayer | null; status: StoryAudioStatus } {
  const native = useAudioPlayer(source, { updateInterval: 100 });
  const s = useAudioPlayerStatus(native);
  const player = useMemo<StoryAudioPlayer>(() => ({
    play: async () => { native.play(); },
    pause: () => { try { native.pause(); } catch { /* released */ } },
    seekTo: seconds => native.seekTo(seconds),
    setMuted: muted => { try { native.muted = muted; } catch { /* released */ } },
    get playing() { return native.playing; },
    get currentTime() { return native.currentTime; },
  }), [native]);
  const status: StoryAudioStatus = { isLoaded: s.isLoaded, playing: s.playing, buffering: s.isBuffering, currentTime: s.currentTime, duration: s.duration, didJustFinish: s.didJustFinish, error: null };
  return { player, status };
}
