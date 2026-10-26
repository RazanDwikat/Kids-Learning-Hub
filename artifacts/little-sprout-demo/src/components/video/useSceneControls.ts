import { useCallback, useMemo, useState } from 'react';
export function useSceneControls(base:Record<string,number>){
 const keys=useMemo(()=>Object.keys(base),[base]);const [activeIndex,setIndex]=useState(0);const [locked,setLocked]=useState(false);const [paused,setPaused]=useState(false);const [mountKey,setMount]=useState(0);const [tick,setTick]=useState(0);
 const durations=useMemo(()=>{const k=keys[activeIndex];if(locked)return {[`${k}_r1`]:base[k],[`${k}_r2`]:base[k]};return Object.fromEntries(keys.map((_,i)=>{const key=keys[(i+activeIndex)%keys.length];return [key,base[key]]}));},[base,keys,activeIndex,locked]);
 const onSceneChange=useCallback((key:string)=>{const i=keys.indexOf(key.replace(/_r[12]$/,''));if(i>=0)setIndex(i);setTick(t=>t+1)},[keys]);
 const jumpTo=useCallback((i:number)=>{setIndex(i);setPaused(false);setMount(k=>k+1);setTick(t=>t+1)},[]);
 const toggleLock=useCallback(()=>{setLocked(v=>!v);setPaused(false);setMount(k=>k+1);setTick(t=>t+1)},[]);
 return {keys,activeIndex,locked,paused,mountKey,tick,durations,onSceneChange,jumpTo,toggleLock,togglePause:()=>setPaused(v=>!v),total:Object.values(base).reduce((a,b)=>a+b,0),start:keys.slice(0,activeIndex).reduce((a,k)=>a+base[k],0),duration:base[keys[activeIndex]]};
}
