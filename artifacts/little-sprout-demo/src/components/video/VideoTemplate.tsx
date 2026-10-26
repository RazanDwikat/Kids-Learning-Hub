/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
import { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { VideoCanvas, VideoPausedContext, useVideoPlayer, type VideoAspectRatio } from '@/lib/video';
import { Walkthrough, TOUR } from './Walkthrough';

export const SCENE_DURATIONS = {home:9050,story:9600,interact:9000,review:8400,homework:9600,adventure:7800,practice:9000,rewards:9600,progress:9600,scope:8350};
export const VIDEO_ASPECT_RATIO:VideoAspectRatio='16:9';
const offsets:Record<string,number>={};let cursor=0;for(const [key,ms] of Object.entries(SCENE_DURATIONS)){offsets[key]=cursor/1000;cursor+=ms;}
export default function VideoTemplate({durations=SCENE_DURATIONS,loop=true,paused=false,muted=false,onSceneChange}:{durations?:Record<string,number>;loop?:boolean;paused?:boolean;muted?:boolean;onSceneChange?:(key:string)=>void}={}){
 const {currentSceneKey}=useVideoPlayer({durations,loop,paused});
 const base=currentSceneKey.replace(/_r[12]$/,'');const index=TOUR.findIndex(s=>s.key===base);
 const audio=useRef<HTMLAudioElement>(null);const last=useRef<string|null>(null);
 useEffect(()=>{onSceneChange?.(currentSceneKey)},[currentSceneKey,onSceneChange]);
 useEffect(()=>{const a=audio.current;if(!a)return;a.volume=.45;if(paused){a.pause();return}if(last.current!==currentSceneKey){last.current=currentSceneKey;const t=offsets[base]??0;if(Math.abs(a.currentTime-t)>.18)a.currentTime=t;}void a.play().catch(()=>{});},[currentSceneKey,base,paused,muted]);
 return <VideoPausedContext.Provider value={paused}><VideoCanvas aspectRatio={VIDEO_ASPECT_RATIO} style={{background:'#fff9ef'}}><AnimatePresence mode="sync">{index>=0&&<Walkthrough index={index} key={currentSceneKey}/>}</AnimatePresence><audio ref={audio} src={`${import.meta.env.BASE_URL}audio/walkthrough_music.mp3`} preload="auto" autoPlay muted={muted}/></VideoCanvas></VideoPausedContext.Provider>;
}
