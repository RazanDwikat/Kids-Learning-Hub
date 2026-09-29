import { useEffect, useRef, useState } from 'react';

export type StoryBeat = { text:string; action?:()=>void; duration?:number; sound?:'move'|'correct'|'guide'|'reward'|'complete' };

/** One cancellable utterance at a time. Resume repeats the interrupted sentence. */
export function useLessonAudio() {
  const [muted,setMuted]=useState(()=>{try{return localStorage.getItem('sprout-sound')==='off';}catch{return false;}});
  const [paused,setPaused]=useState(false);
  const [busy,setBusy]=useState(false);
  const [caption,setCaption]=useState('A little apple adventure awaits.');
  const [unavailable,setUnavailable]=useState(false);
  const state=useRef({ muted, paused:false, beats:[] as StoryBeat[], index:0, token:0, timer:0, watchdog:0, done:undefined as (()=>void)|undefined, voice:undefined as SpeechSynthesisVoice|undefined, context:undefined as AudioContext|undefined, failed:false });
  const clear=()=>{
    const s=state.current; s.token++; window.clearTimeout(s.timer); window.clearTimeout(s.watchdog);
    if('speechSynthesis' in window) window.speechSynthesis.cancel();
  };
  const unlock=()=>{try{const s=state.current;s.context??=new AudioContext();if(!s.muted)void s.context.resume();}catch{}};
  const chime=(kind:StoryBeat['sound']='move')=>{
    const s=state.current;if(s.muted||s.paused)return;
    try {
      const ctx=s.context??(s.context=new AudioContext()); void ctx.resume();
      const notes=kind==='complete'?[523,659,784,1047]:kind==='reward'?[523,659,784]:kind==='correct'?[523,784]:kind==='guide'?[392,440]:[587];
      notes.forEach((frequency,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+i*.15;o.type='sine';o.frequency.value=frequency;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.055,t+.025);g.gain.exponentialRampToValueAtTime(.001,t+.28);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.3);});
    } catch { /* Captions and animation remain available without audio hardware. */ }
  };
  const advance=()=>{
    const s=state.current;if(s.paused)return;
    const beat=s.beats[s.index];
    if(!beat){setBusy(false);s.done?.();s.done=undefined;return;}
    const token=++s.token;
    let started=false,ended=false;
    const start=()=>{if(s.token!==token||started)return;started=true;setCaption(beat.text);beat.action?.();if(beat.sound)chime(beat.sound);};
    const end=()=>{if(s.token!==token||ended)return;ended=true;window.clearTimeout(s.timer);window.clearTimeout(s.watchdog);s.timer=window.setTimeout(()=>{s.index++;advance();},250);};
    const timed=()=>{start();s.timer=window.setTimeout(end,beat.duration??Math.max(1150,beat.text.split(' ').length*420));};
    if(s.muted||s.failed||!('speechSynthesis' in window)){timed();return;}
    const u=new SpeechSynthesisUtterance(beat.text);u.lang='en-US';u.rate=.84;u.pitch=1.05;if(s.voice)u.voice=s.voice;
    const fallback=()=>{if(s.token!==token||ended)return;u.onstart=null;u.onend=null;u.onerror=null;window.clearTimeout(s.watchdog);s.failed=true;setUnavailable(true);window.speechSynthesis.cancel();timed();};
    u.onstart=()=>{window.clearTimeout(s.watchdog);start();s.watchdog=window.setTimeout(()=>{s.failed=true;setUnavailable(true);window.speechSynthesis.cancel();end();},Math.max(7000,beat.text.length*180));};
    u.onend=end;
    u.onerror=fallback;
    s.watchdog=window.setTimeout(fallback,2500);
    window.speechSynthesis.speak(u);
  };
  const stop=(message?:string)=>{clear();state.current.beats=[];state.current.done=undefined;void state.current.context?.suspend();setBusy(false);if(message)setCaption(message);};
  const play=(beats:StoryBeat[],done?:()=>void)=>{clear();const s=state.current;s.paused=false;s.beats=beats;s.index=0;s.done=done;setPaused(false);setBusy(true);advance();};
  const pause=()=>{const s=state.current;if(s.paused){s.paused=false;setPaused(false);void s.context?.resume();advance();}else{clear();s.paused=true;setPaused(true);void s.context?.suspend();}};
  const toggleMute=()=>{const s=state.current;s.muted=!s.muted;setMuted(s.muted);try{localStorage.setItem('sprout-sound',s.muted?'off':'on');}catch{}if(s.muted)void s.context?.suspend();else void s.context?.resume();clear();if(!s.paused&&s.index<s.beats.length)advance();};
  useEffect(()=>{
    const s=state.current;
    if(!('speechSynthesis' in window)){s.failed=true;setUnavailable(true);return()=>{clear();void s.context?.close();};}
    const choose=()=>{const voices=window.speechSynthesis.getVoices().filter(v=>/^en[-_]/i.test(v.lang));s.voice=voices.find(v=>/Samantha|Aria|Jenny|Google US English|Natural/i.test(v.name))??voices.find(v=>v.default)??voices[0];};
    choose();window.speechSynthesis.addEventListener('voiceschanged',choose);
    return()=>{clear();window.speechSynthesis.removeEventListener('voiceschanged',choose);void s.context?.close();};
  },[]);
  return {muted,paused,busy,caption,unavailable,play,stop,pause,toggleMute,chime,unlock};
}