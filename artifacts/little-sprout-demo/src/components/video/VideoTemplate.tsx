/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { VideoCanvas, VideoPausedContext, useVideoPlayer, type VideoAspectRatio } from '@/lib/video';
import { Intro, Story, Review, Homework, Family, Finale } from './Scenes';

export const SCENE_DURATIONS = {intro:4300,story:5900,review:4800,homework:4850,family:6400,finale:3750};
export const VIDEO_ASPECT_RATIO:VideoAspectRatio='16:9';
const scenes:Record<string,typeof Intro>={intro:Intro,story:Story,review:Review,homework:Homework,family:Family,finale:Finale};
const offsets:Record<string,number>={};let cursor=0;for(const [key,ms] of Object.entries(SCENE_DURATIONS)){offsets[key]=cursor/1000;cursor+=ms;}
export default function VideoTemplate({durations=SCENE_DURATIONS,loop=true,paused=false,muted=false,onSceneChange}:{durations?:Record<string,number>;loop?:boolean;paused?:boolean;muted?:boolean;onSceneChange?:(key:string)=>void}={}){
 const {currentSceneKey}=useVideoPlayer({durations,loop,paused});
 const base=currentSceneKey.replace(/_r[12]$/,'');const Scene=scenes[base];
 const audio=useRef<HTMLAudioElement>(null);const last=useRef<string|null>(null);
 useEffect(()=>{onSceneChange?.(currentSceneKey)},[currentSceneKey,onSceneChange]);
 useEffect(()=>{const a=audio.current;if(!a)return;a.volume=.45;if(paused){a.pause();return}if(last.current!==currentSceneKey){last.current=currentSceneKey;const t=offsets[base]??0;if(Math.abs(a.currentTime-t)>.18)a.currentTime=t;}void a.play().catch(()=>{});},[currentSceneKey,base,paused,muted]);
 return <VideoPausedContext.Provider value={paused}><VideoCanvas aspectRatio={VIDEO_ASPECT_RATIO} style={{background:'#fff9ef'}}><motion.div style={{position:'absolute',inset:0}} animate={{rotate:base==='homework'?.25:0}} transition={{duration:1}}><AnimatePresence mode="sync">{Scene&&<Scene key={currentSceneKey}/>}</AnimatePresence></motion.div><audio ref={audio} src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`} preload="auto" autoPlay muted={muted}/></VideoCanvas></VideoPausedContext.Provider>;
}
