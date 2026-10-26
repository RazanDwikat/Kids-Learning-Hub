import { TOUR } from './Walkthrough';
export interface SceneDetails{title:string;filePath:string}
export const SCENE_DETAILS:Record<string,SceneDetails>=Object.fromEntries(TOUR.map(s=>[s.key,{title:s.title,filePath:'src/components/video/Walkthrough.tsx'}]));
