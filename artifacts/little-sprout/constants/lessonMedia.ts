import narration from '../assets/audio/narration.json';

export type Beat = { key: string; start: number; end: number; text: string };
export type StoryTrack = { source: number; duration: number; beats: Beat[] };
type NarrationFile = { story: { duration: number; beats: Beat[] }; groups: { duration: number; beats: Beat[] } };
const data = narration as NarrationFile;

export const STORY_TRACKS: Record<'story' | 'groups', StoryTrack> = {
  story: { source: require('../assets/audio/story.wav'), ...data.story },
  groups: { source: require('../assets/audio/groups.wav'), ...data.groups },
};
