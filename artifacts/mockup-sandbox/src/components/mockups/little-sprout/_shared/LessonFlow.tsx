import { useEffect, useRef, useState } from 'react';
import { Apple, ArrowDown, ArrowUp, Pause, Play, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { useLessonAudio, type StoryBeat } from './useLessonAudio';
import './lesson.css';

const bunny='/__mockup/images/sprout-bunny.png';
const titles=['A little apple story','Put them together!','Your turn to help','Count with Bunny','Bunny’s big challenge'];
const words=['One.','Two.','Three.','Four.','Five.','Six.','Seven.'];

export function LessonFlow({onExit,onComplete,onAttempt}:{onExit:()=>void;onComplete:()=>void;onAttempt:(correct:boolean)=>void}) {
  const [video,setVideo]=useState(0),[started,setStarted]=useState(false),[phase,setPhase]=useState(0),[highlight,setHighlight]=useState(-1),[ready,setReady]=useState(false),[solved,setSolved]=useState(false),[counted,setCounted]=useState<number[]>([]),[celebrate,setCelebrate]=useState(false);
  const audio=useLessonAudio();
  const world=useRef<HTMLDivElement>(null),touch=useRef<number|null>(null),lock=useRef(0);
  const total=video===3?5:video===4?7:4,first=video===3?3:video===4?4:2;
  const countBeats=(n:number):StoryBeat[]=>words.slice(0,n).map((text,i)=>({text,action:()=>{setHighlight(i);setCounted(a=>a.includes(i)?a:[...a,i]);},sound:'move'}));
  const reset=()=>{setPhase(0);setHighlight(-1);setReady(false);setSolved(false);setCounted([]);setCelebrate(false);};
  const run=(v:number)=>{
    audio.unlock();reset();setStarted(true);
    const beat=(text:string,p:number,sound?:StoryBeat['sound']):StoryBeat=>({text,action:()=>setPhase(p),sound});
    if(v===0) audio.play([
      beat('Meet our little bunny!',1,'move'),beat('He has two apples.',2),
      beat('Look! Here comes his mom.',3,'move'),beat('She gives him two more apples.',4,'move'),
      beat('Let’s put all the apples together.',5,'move'),
      {text:'Let’s count them together.'},...countBeats(4),
      {text:'Four apples!',sound:'reward',action:()=>{setHighlight(-1);setCelebrate(true);setPhase(6);}},
      beat('Two plus two equals four!',7)
    ],()=>setReady(true));
    else if(v===1) audio.play([
      beat('Addition means putting groups together.',1),beat('Here are two apples.',2,'move'),
      beat('Now we add two more.',3,'move'),beat('Let’s put them together.',5,'move'),
      ...countBeats(4),{text:'Now we have four apples!',action:()=>{setHighlight(-1);setPhase(6);setCelebrate(true);},sound:'reward'},
      beat('Two plus two equals four.',7)
    ],()=>setReady(true));
    else audio.play([
      beat(v===2?'Your turn! Let’s put two and two together.':v===3?'Here are three apples, and two more.':'One last challenge! Four apples, and three more.',3,'move'),
      {text:v===2?'Tap each apple to count it. Then choose how many altogether.':'How many apples are there altogether?',action:()=>setPhase(3)}
    ]);
  };
  const answer=(n:number)=>{
    if(audio.busy||audio.paused||solved)return;
    onAttempt(n===total);
    if(n!==total){
      audio.play([{text:'Almost! Let’s count together.',sound:'guide',action:()=>{setPhase(5);setCounted([]);setHighlight(-1);}},...countBeats(total),{text:`${total} apples. Try that number!`,action:()=>setHighlight(-1)}]);
    } else {
      setSolved(true);
      audio.play([{text:video===4?'Amazing!':'Great job!',sound:video===4?'complete':'correct',action:()=>{setPhase(5);setCelebrate(true);}},
        ...(video===2?countBeats(4):[]),
        {text:`${first} plus ${total-first} equals ${total}!`,action:()=>{setHighlight(-1);setPhase(7);},sound:'reward'},
        {text:video===4?'You completed the addition lesson! You kept trying and grew your brain.':'You counted them all. Well done!'}
      ],()=>{setReady(true);if(video===4)onComplete();});
    }
  };
  const tapApple=(i:number)=>{
    if(video<2||audio.busy||audio.paused||solved||counted.includes(i))return;
    const next=[...counted,i];setCounted(next);setHighlight(i);audio.play([{text:words[next.length-1],sound:'move'}],()=>setHighlight(-1));
  };
  const navigate=(direction:number)=>{
    if(Date.now()<lock.current||!started||audio.paused)return;
    if(direction>0&&!ready)return;
    const next=video+direction;if(next<0||next>4)return;
    lock.current=Date.now()+1000;audio.stop();setVideo(next);run(next);
  };
  useEffect(()=>{
    const animations=world.current?.getAnimations({subtree:true})??[];
    animations.forEach(a=>audio.paused?a.pause():a.play());
  },[audio.paused]);
  // Unmounting the audio hook cancels speech, timers, and sound effects.
  return <div className="sprout"><main className={`show ${audio.paused?'paused':''}`} data-video={video}
    onWheel={e=>{if(Math.abs(e.deltaY)>35)navigate(e.deltaY>0?1:-1);}}
    onTouchStart={e=>{if((e.target as HTMLElement).closest('button'))return;touch.current=e.touches[0].clientY;}}
    onTouchEnd={e=>{if(touch.current===null)return;const delta=touch.current-e.changedTouches[0].clientY;touch.current=null;if(Math.abs(delta)>65)navigate(delta>0?1:-1);}}>
    <div className="show-inner">
      <header className="lesson-top"><button className="icon-btn" onClick={()=>{audio.stop();onExit();}} aria-label="Close lesson"><X size={20}/></button><div className="lesson-progress" aria-label={`Video ${video+1} of 5`}>{titles.map((_,i)=><i key={i} className={i<=video?'done':''}/>)}</div><span className="chapter-count">Video {video+1} / 5</span></header>
      <div className="show-heading"><span className="eyebrow">ADDITION · {video<2?'WATCH & LEARN':video===4?'MINI CHALLENGE':'YOUR TURN'}</span><h1>{titles[video]}</h1>{video>=2&&<div className="show-equation">{first} + {total-first} = {phase===7?total:'?'}</div>}</div>
      <div ref={world} className={`show-world ${celebrate?'cheer':''}`}>
        <div className={`show-bunny ${phase>=1?'visible':''} ${video>0?'solo':''}`}><img src={bunny} alt="Little Bunny"/></div>
        {video===0&&<div className={`show-bunny mother ${phase>=3?'visible':''}`}><img src={bunny} alt="Mama Bunny with a pink scarf"/></div>}
        {Array.from({length:total},(_,i)=>{
          const merged=phase>=5||(video===2&&counted.includes(i));
          const group=i<first?0:1,local=group?i-first:i;
          const visible=video===0?(i<2?phase>=1:phase>=3):i<first?phase>=2:phase>=3;
          let x:number,y:number;
          if(merged){x=total>5?12+(i%4)*23:8+i*(76/(total-1));y=total>5?(i<4?58:76):72;}
          else if(video===0){x=i<2?8+i*17:(phase>=4?23:62)+(i-2)*17;y=phase>=4&&i>=2?65:48;}
          else {x=(group?61:4)+(local%2)*19;y=local<2?35:85;}
          if(total>5&&merged)y=i<4?30:85;
          const rowY=total>4&&(!merged||total>5)?((merged?i<4:local<2)?'max(0px, calc(100cqh - 120px))':'max(56px, calc(100cqh - 64px))'):`calc(${y} * (100cqh - 58px) / 100)`;
          return <button key={i} className={`show-apple ${highlight===i?'highlight':''} ${counted.includes(i)?'counted':''}`}
            style={{transform:`translate(calc(${x} * (100cqw - 52px) / 100), ${rowY})`,opacity:visible?1:0,pointerEvents:visible?'auto':'none'}}
            disabled={video<2||audio.busy||audio.paused||solved} aria-label={`Count apple ${i+1}${counted.includes(i)?', counted':''}`} onClick={()=>tapApple(i)}>
            <Apple/>{highlight===i&&<span>{video===2&&phase<5?counted.length:i+1}</span>}
          </button>;
        })}
        {video>0&&phase>=3&&phase<5&&<span className="show-plus" aria-hidden="true">+</span>}
        {phase===6&&<div className="show-total">{total}</div>}
        {video<2&&phase===7&&<div className="show-math">{first} + {total-first} = {total}</div>}
        {celebrate&&<div className="show-confetti" aria-hidden="true">{Array.from({length:video===4?28:12},(_,i)=><i key={i} style={{left:`${(i*37)%100}%`,animationDelay:`${(i%7)*.17}s`}}/>)}</div>}
        {!started&&<div className="show-start"><img src={bunny} alt="Bunny is ready to tell a story"/><button className="button coral" onClick={()=>run(0)}><Play size={20}/> Play story</button><p className="show-status">Five little videos. One happy discovery.</p></div>}
      </div>
      <div className="show-caption" aria-live={audio.muted?'polite':'off'}>{audio.paused?'Paused. Your apples will wait for you.':audio.caption}</div>
      {video>=2&&started&&<div className="answer-options" aria-label="Choose how many apples">{(video===2?[3,4,5]:video===3?[4,5,6]:[6,7,8]).map(n=><button key={n} disabled={audio.busy||audio.paused||solved||(video===2&&counted.length<4)} onClick={()=>answer(n)}>{n}</button>)}</div>}
      {audio.unavailable&&<p className="show-status" role="status">Narration is unavailable in this browser. Follow the captions and apples.</p>}
      <div className="show-toolbar"><button disabled={!started} onClick={audio.pause}>{audio.paused?<Play size={17}/>:<Pause size={17}/>} {audio.paused?'Resume':'Pause'}</button><button onClick={audio.toggleMute}>{audio.muted?<VolumeX size={17}/>:<Volume2 size={17}/>} Sound {audio.muted?'Off':'On'}</button><button disabled={!started} onClick={()=>run(video)} aria-label="Replay video"><RotateCcw size={17}/> Replay</button></div>
      <div className="show-nav"><button className="icon-btn" disabled={video===0||audio.paused} onClick={()=>navigate(-1)} aria-label="Previous video"><ArrowUp size={20}/></button><button className="button coral" disabled={!ready||audio.paused||video===4} onClick={()=>navigate(1)}>Next video <ArrowDown size={18}/></button></div>
      <div className="show-status">{started&&video<2&&!ready?<button className="text-link" disabled={audio.paused} onClick={()=>{audio.stop('Two plus two equals four.');setPhase(7);setHighlight(-1);setReady(true);}}>Skip animation</button>:video===2&&!solved?`${counted.length} / 4 apples counted · tap each apple`:ready?'Swipe up, scroll, or use the arrows':video>=2?'Choose an answer when Bunny is ready':'Tap Play story to begin'}</div>
    </div>
  </main></div>;
}