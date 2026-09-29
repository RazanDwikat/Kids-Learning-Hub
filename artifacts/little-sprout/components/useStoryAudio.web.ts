import { useEffect, useState } from 'react';
import { Asset } from 'expo-asset';
import { initialStatus, WebStoryAudio, type StoryAudioPlayer, type StoryAudioStatus } from './storyAudioCore';

export type { StoryAudioPlayer, StoryAudioStatus };

export function useStoryAudio(source: number): { player: StoryAudioPlayer | null; status: StoryAudioStatus } {
  const [player, setPlayer] = useState<WebStoryAudio | null>(null);
  const [status, setStatus] = useState<StoryAudioStatus>(initialStatus);
  useEffect(() => {
    const audio = new WebStoryAudio(new Audio(), Asset.fromModule(source).uri);
    const unsubscribe = audio.subscribe(setStatus);
    setPlayer(audio);
    return () => { unsubscribe(); audio.release(); setPlayer(null); };
  }, [source]);
  return { player, status };
}
