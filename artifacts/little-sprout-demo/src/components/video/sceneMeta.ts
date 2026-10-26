export interface SceneDetails{title:string;filePath:string}
export const SCENE_DETAILS:Record<string,SceneDetails>=Object.fromEntries(Object.entries({intro:'Little steps',story:'Add apples',review:'Review the story',homework:'Homework adventure',family:'Parent dashboard',finale:'Little Sprout'}).map(([key,title])=>[key,{title,filePath:'src/components/video/Scenes.tsx'}]));
