import { RECORDED_CHAPTERS } from './recordedMeta';
export interface SceneDetails{title:string;filePath:string}
export const SCENE_DETAILS:Record<string,SceneDetails>=Object.fromEntries(RECORDED_CHAPTERS.map(s=>[s.key,{title:s.title,filePath:'src/components/video/VideoTemplate.tsx'}]));
