/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
import { useEffect, useRef, useState } from 'react';
import { VideoCanvas, useVideoPlayer, type VideoAspectRatio } from '@/lib/video';
import { RECORDED_CHAPTERS } from './recordedMeta';

export const SCENE_DURATIONS:Record<string,number>=Object.fromEntries(RECORDED_CHAPTERS.map(c=>[c.key,c.duration]));
export const VIDEO_ASPECT_RATIO:VideoAspectRatio='16:9';
const offsets:Record<string,number>={};let cursor=0;for(const c of RECORDED_CHAPTERS){offsets[c.key]=cursor;cursor+=c.duration/1000;}
const baseKey=(key:string)=>key.replace(/_r[12]$/,'');
type Props={durations?:Record<string,number>;loop?:boolean;paused?:boolean;muted?:boolean;onSceneChange?:(key:string)=>void};
function RecordingClock({durations,loop,paused,onChange}:{durations:Record<string,number>;loop:boolean;paused:boolean;onChange:(key:string)=>void}){
 const {currentSceneKey}=useVideoPlayer({durations,loop,paused});
 const callback=useRef(onChange);callback.current=onChange;
 useEffect(()=>{callback.current(currentSceneKey)},[currentSceneKey]);
 return null;
}
export default function VideoTemplate({durations=SCENE_DURATIONS,loop=true,paused=false,muted=false,onSceneChange}:Props={}){
 const video=useRef<HTMLVideoElement>(null);const [playing,setPlaying]=useState(false);const [error,setError]=useState(false);
 const initialOffset=useRef(offsets[baseKey(Object.keys(durations)[0])]);const previous=useRef<string|null>(null);
 const frameCallback=useRef<number|null>(null);
 useEffect(()=>{const v=video.current;if(!v)return;if(paused)v.pause();else void v.play().catch(()=>{});},[paused,muted]);
 useEffect(()=>()=>{if(frameCallback.current!==null)video.current?.cancelVideoFrameCallback(frameCallback.current)},[]);
 const begin=()=>{
  const v=video.current;if(!v)return;v.currentTime=initialOffset.current;
  const firstFrame=(_now:number,metadata:VideoFrameCallbackMetadata)=>{
   if(metadata.mediaTime>initialOffset.current+.001){setPlaying(true);return}
   frameCallback.current=v.requestVideoFrameCallback(firstFrame);
  };
  frameCallback.current=v.requestVideoFrameCallback(firstFrame);
  if(!paused)void v.play().catch(()=>{});
 };
 const sceneChanged=(key:string)=>{
  const old=previous.current;const nextBase=baseKey(key);
  // Automatic contiguous chapter changes do not seek: AV remains locked to
  // the MP4's own clock. Only repeating a selected chapter needs a seek.
  if(old&&baseKey(old)===nextBase&&video.current){video.current.currentTime=offsets[nextBase];if(!paused)void video.current.play().catch(()=>{})}
  previous.current=key;onSceneChange?.(key);
 };
 return <VideoCanvas aspectRatio={VIDEO_ASPECT_RATIO} style={{background:'#fff9ef'}}>
  <video ref={video} src={`${import.meta.env.BASE_URL}female-walkthrough-preview.webm`} poster={`${import.meta.env.BASE_URL}female-walkthrough-poster.jpg`} preload="auto" playsInline autoPlay={!paused} loop={loop} muted={muted} onLoadedMetadata={begin} onError={()=>setError(true)} style={{width:'100%',height:'100%',display:'block',objectFit:'contain'}}/>
  {!playing&&<div style={{position:'absolute',inset:0,display:'grid',placeContent:'center',background:'#fff9efe8',textAlign:'center',color:'#397567',fontFamily:'DM Sans, sans-serif'}}><strong style={{fontSize:'2.6cqw'}}>little sprout.</strong><p dir="rtl" style={{fontSize:'1.4cqw'}}>{error?'تعذّر تحميل العرض. أعد تحميل الصفحة للمحاولة مرة ثانية.':'جارٍ تجهيز الجولة بالصوت والصورة…'}</p></div>}
  {playing&&<RecordingClock durations={durations} loop={loop} paused={paused} onChange={sceneChanged}/>}
 </VideoCanvas>;
}
