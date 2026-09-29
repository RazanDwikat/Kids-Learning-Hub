import { useEffect, useRef, useState } from 'react';
import { Apple, ArrowDown, ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, CircleHelp, Compass, Gift, Heart, Home as HomeIcon, LockKeyhole, Medal, Pause, Play, Plus, RotateCcw, Sparkles, Sprout, Star, UserRound, Volume2, VolumeX, X } from 'lucide-react';
import '../_group.css';

type Screen = 'home'|'profile'|'math'|'intro'|'lesson'|'complete'|'map'|'question'|'treasure'|'practice'|'practiceDone'|'parent'|'insights';
type Initial = 'home'|'lesson'|'map'|'practice'|'parent';
type RecordItem = { independent:number; hints:number; explanations:number; attempts:number };
const bunny = '/__mockup/images/sprout-bunny.png';
const orchard = '/__mockup/images/sprout-orchard.png';
const chapters = [
  { label:'A little apple story', subtitle:'Bunny has 2 apples. Mama brings 2 more!', bg:'sky' },
  { label:'Put them together!', subtitle:'Addition means making one big group.', bg:'apricot' },
  { label:'Your turn to help', subtitle:'Tap the apples to move them over.', bg:'lilac' },
  { label:'Count with Bunny', subtitle:'How many apples altogether?', bg:'butter' },
  { label:'Bunny’s big challenge', subtitle:'One last little puzzle!', bg:'mint' }
];
const homework = [
  { place:'Apple tree', equation:'2 + 1', answer:3, options:[2,3,4], a:2,b:1 },
  { place:'Little bridge', equation:'3 + 2', answer:5, options:[4,5,6], a:3,b:2 },
  { place:'Flower field', equation:'4 + 2', answer:6, options:[5,6,7], a:4,b:2 },
  { place:'Treasure hill', equation:'5 + 3', answer:8, options:[7,8,9], a:5,b:3 }
];
const practices = [
  {kind:'Choose an answer', title:'2 + 3 = ?', answer:'5', choices:['4','5','6'], a:2,b:3},
  {kind:'Move a number', title:'3 + 3 = ?', answer:'6', choices:['5','6','7'], a:3,b:3},
  {kind:'Make a match', title:'Match 2 + 2', answer:'4', choices:['3','4','5'], a:2,b:2},
  {kind:'Count the apples', title:'How many altogether?', answer:'7', choices:['6','7','8'], a:4,b:3},
  {kind:'Write the answer', title:'4 + 3 = ?', answer:'7', choices:[], a:4,b:3},
  {kind:'Put in order', title:'Smallest to biggest', answer:'3,4,5', choices:['5','3','4'], a:0,b:0}
];

function Apples({count, small=false}:{count:number;small?:boolean}) {
  return <div className={`apple-group ${small?'small':''}`} aria-label={`${count} apples`}>{Array.from({length:count},(_,i)=><Apple className="apple" key={i} style={{animationDelay:`${i*70}ms`}} />)}</div>;
}
function CountHint({a,b}:{a:number;b:number}) {
  return <div className="hint-box"><strong>Almost! Let’s try it another way.</strong><p>Count each apple, one by one. You’ve got this!</p><div className="count-dots">{Array.from({length:a+b},(_,i)=><Apple className="apple" key={i}/>)}</div></div>;
}
function Brand(){ return <div className="brand"><span className="brand-mark"><Sprout size={20}/></span>little sprout<span style={{color:'#ed7868'}}>.</span></div>; }

export function Prototype({initial='home'}:{initial?:Initial}) {
  const [screen,setScreen] = useState<Screen>(initial);
  const [chapter,setChapter] = useState(0);
  const [playing,setPlaying] = useState(true);
  const [videoProgress,setVideoProgress] = useState(0);
  const [muted,setMuted] = useState(false);
  const [moved,setMoved] = useState(0);
  const [feedback,setFeedback] = useState(false);
  const [lessonSolved,setLessonSolved] = useState(false);
  const [unlocked,setUnlocked] = useState(0);
  const [stop,setStop] = useState(0);
  const [practiceIndex,setPracticeIndex] = useState(0);
  const [selection,setSelection] = useState('');
  const [order,setOrder] = useState<string[]>([]);
  const [record,setRecord] = useState<RecordItem>({independent:0,hints:0,explanations:0,attempts:0});
  const [lessonFinished,setLessonFinished] = useState(initial==='map'||initial==='practice'||initial==='parent');
  const [homeworkFinished,setHomeworkFinished] = useState(initial==='practice'||initial==='parent');
  const [practiceFinished,setPracticeFinished] = useState(initial==='parent');
  const touchStart = useRef<number|null>(null);
  const go=(s:Screen)=>{setFeedback(false);setScreen(s);};
  const resetLesson=()=>{setChapter(0);setMoved(0);setLessonSolved(false);setVideoProgress(0);setPlaying(true);go('lesson');};
  const nextChapter=()=>{setFeedback(false);setMoved(0);setLessonSolved(false);setVideoProgress(0);setPlaying(true);if(chapter===4){setLessonFinished(true);go('complete');}else setChapter(c=>c+1);};
  const previousChapter=()=>{if(chapter>0){setChapter(c=>c-1);setFeedback(false);setLessonSolved(false);setMoved(0);setVideoProgress(0);}else go('intro');};
  useEffect(()=>{
    if(screen!=='lesson'||!playing||videoProgress>=100) return;
    const timer=window.setInterval(()=>setVideoProgress(p=>Math.min(100,p+2)),110);
    return ()=>window.clearInterval(timer);
  },[screen,playing,videoProgress,chapter]);
  const solve=(value:number,correct:number,done:()=>void)=>{
    setRecord(r=>({...r,attempts:r.attempts+1}));
    if(value===correct){setRecord(r=>({...r,independent:r.independent+(!feedback?1:0)}));setFeedback(false);done();}
    else {setFeedback(true);setRecord(r=>({...r,hints:r.hints+1}));}
  };
  const openHomeworkStop=(index:number)=>{if(lessonFinished&&index<=unlocked){setStop(index);go('question');}};
  const finishHomeworkStop=()=>{const next=Math.max(unlocked,stop+1);setUnlocked(next);if(stop===3){setHomeworkFinished(true);go('treasure');}else go('map');};
  const practiceNext=()=>{
    const correct=practices[practiceIndex].answer;
    const answer=practiceIndex===5?order.join(','):selection.trim();
    setRecord(r=>({...r,attempts:r.attempts+1}));
    if(answer===correct){setRecord(r=>({...r,independent:r.independent+(!feedback?1:0)}));setFeedback(false);setSelection('');setOrder([]);if(practiceIndex===5){setPracticeFinished(true);go('practiceDone');}else setPracticeIndex(i=>i+1);}
    else {setFeedback(true);setRecord(r=>({...r,hints:r.hints+1}));}
  };
  const navigation=<nav className="bottom-nav" aria-label="Main navigation">
    {([
      ['home',HomeIcon,'Home'],['math',BookOpen,'Learn'],['map',Compass,'Homework'],['practice',Star,'Practice'],['parent',UserRound,'Grown-up']
    ] as const).map(([dest,Icon,label])=><button key={dest} className={(screen===dest||(['intro','lesson','complete'].includes(screen)&&dest==='math')||(['question','treasure'].includes(screen)&&dest==='map')||(['practiceDone'].includes(screen)&&dest==='practice')||(['insights'].includes(screen)&&dest==='parent'))?'active':''} onClick={()=>go(dest)}><Icon size={20} strokeWidth={2.2}/><span>{label}</span></button>)}
  </nav>;
  const back=(dest:Screen)=><button className="icon-btn" onClick={()=>go(dest)} aria-label="Go back"><ArrowLeft size={20}/></button>;
  const top=(dest:Screen,title?:string)=><div className="topbar">{back(dest)}{title?<span className="eyebrow">{title}</span>:<Brand/>}<span style={{width:43}}/></div>;
  const moreHelp=()=>{setFeedback(true);setRecord(r=>({...r,explanations:r.explanations+1}));};

  if(screen==='lesson') {
    const interactive=chapter>=2;
    const canNext=chapter<2||lessonSolved||(chapter===2&&moved>=2);
    return <div className="sprout"><main className="lesson-screen" onTouchStart={e=>touchStart.current=e.touches[0].clientY} onTouchEnd={e=>{if(touchStart.current===null)return;const delta=touchStart.current-e.changedTouches[0].clientY;if(delta>70&&canNext)nextChapter();else if(delta< -70)previousChapter();touchStart.current=null;}}>
      <div className={`lesson-stage ${chapters[chapter].bg}`}>
        <div className="lesson-top"><button className="icon-btn" onClick={()=>go('intro')} aria-label="Close lesson"><X size={21}/></button><div className="lesson-progress">{chapters.map((_,i)=><i key={i} className={i<=chapter?'done':''}/>)}</div><span className="chapter-count">{chapter+1} / 5</span></div>
        <div className="chapter-header"><span className="eyebrow">STORYBOARD · ADDITION</span><h1>{chapters[chapter].label}</h1><p>{chapters[chapter].subtitle}</p></div>
        <div className="chapter-art">
          {chapter===0&&<><img className="orchard-image" src={orchard} alt="Bunny in the apple orchard with apples"/><div className="story-bubble" style={{position:'absolute',bottom:4}}>2 + 2 = 4</div></>}
          {chapter===1&&<><div className="apple-groups"><Apples count={2}/><span className="operator">+</span><Apples count={2}/></div><div className="sum-line"><span>2</span><Plus size={31}/><span>2</span><span>=</span><span>4</span></div><div className="story-bubble" style={{fontSize:18}}>Two little groups become one!</div></>}
          {chapter===2&&<><img className="bunny-image" src={bunny} alt="Bunny ready to collect apples"/><div className="apple-groups"><Apples count={2+moved}/><span className="operator">←</span><div className="apple-group">{Array.from({length:2-moved},(_,i)=><button key={i} aria-label="Move an apple" onClick={()=>{setMoved(v=>v+1);if(moved===1)setLessonSolved(true);}} style={{border:0,background:'none',padding:0}}><Apple className="apple"/></button>)}</div></div><span className="mini-label">{moved===2?'Wonderful! 2 + 2 = 4':'Tap each apple on the right'}</span></>}
          {chapter===3&&<><div className="apple-groups"><Apples count={3}/><span className="operator">+</span><Apples count={2}/></div><div className="sum-line">3 + 2 = ?</div>{feedback&&<CountHint a={3} b={2}/>}</>}
          {chapter===4&&<><img className="bunny-image" src={bunny} alt="Bunny cheering you on"/><div className="sum-line">4 + 3 = ?</div>{feedback&&<CountHint a={4} b={3}/>}</>}
        </div>
        <div className="chapter-bottom">
          {(chapter===3||chapter===4)&&!lessonSolved&&<div className="answer-options">{(chapter===3?[4,5,6]:[6,7,8]).map(n=><button key={n} onClick={()=>solve(n,chapter===3?5:7,()=>setLessonSolved(true))}>{n}</button>)}</div>}
          {lessonSolved&&chapter>=3&&<span className="pill"><Check size={15}/> Yes! You counted them all.</span>}
          <div className="lesson-controls"><button className="round-control" onClick={()=>setPlaying(v=>!v)} aria-label={playing?'Pause storyboard':'Play storyboard'}>{playing?<Pause size={21} fill="currentColor"/>:<Play size={21} fill="currentColor"/>}</button><button className="round-control" onClick={()=>setMuted(v=>!v)} aria-label={muted?'Turn narration cue on':'Turn narration cue off'}>{muted?<VolumeX size={21}/>:<Volume2 size={21}/>}</button><button className="button coral" disabled={!canNext} onClick={nextChapter}>{chapter===4?'Finish lesson':'Next scene'}<ArrowRight size={18}/></button></div>
          <div className="swipe-tip"><ArrowDown size={13}/>{interactive&&!canNext?'Try the activity to continue':'Swipe up or tap Next · finite story'}</div>
          <div style={{height:3,width:'100%',background:'rgba(57,117,103,.16)',borderRadius:5}}><div style={{height:'100%',width:`${videoProgress}%`,background:'#397567',borderRadius:5,transition:'width .1s linear'}}/></div>
        </div>
      </div>
    </main></div>;
  }

  if(screen==='home') return <div className="sprout"><main className="screen scroll">
    <div className="topbar"><Brand/><div className="top-actions"><button className="avatar" onClick={()=>go('profile')} aria-label="Open Sam's profile">S</button></div></div>
    <div style={{marginTop:25}}><span className="eyebrow">MONDAY IN YOUR LEARNING GARDEN</span><h1 className="hero-title">Hello, Sam!<br/><span style={{color:'var(--coral)'}}>Ready to grow?</span></h1></div>
    <section className="feature"><span className="pill"><Sparkles size={14}/> YOUR NEXT ADVENTURE</span><h2>Let’s add<br/>apples!</h2><p>Grade 1 · Mathematics<br/>A five-scene bunny story</p><img src={bunny} alt="Bunny companion waving"/><button className="mini-cta" onClick={()=>go('intro')}>Start learning <ArrowRight size={15}/></button></section>
    <div className="section-head"><h2>Pick a path</h2><span className="eyebrow">1 TOPIC</span></div>
    <div className="two-actions"><button className="action-tile peach" onClick={()=>go('map')}><span className="tile-icon"><Compass size={21}/></span><span><b>Homework<br/>adventure</b><small>{homeworkFinished?'Treasure found!':lessonFinished?'4 stops await':'Explore the trail'}</small></span></button><button className="action-tile lilac" onClick={()=>go('practice')}><span className="tile-icon"><Star size={21}/></span><span><b>Practice<br/>garden</b><small>6 little challenges</small></span></button></div>
    <div className="section-head"><h2>Your school path</h2></div><button className="curriculum-row" onClick={()=>go('math')}><span className="row-icon"><BookOpen size={22}/></span><span><strong>Grade 1 Mathematics</strong><small>We’re learning addition</small></span><ChevronRight size={19}/></button>
  </main>{navigation}</div>;

  if(screen==='profile') return <div className="sprout"><main className="screen">{top('home','YOUR PROFILE')}<div className="celebrate"><div className="celebrate-art"><img src={bunny} alt="Bunny companion"/></div><span className="pill"><Sprout size={15}/> LITTLE LEARNER</span><h1 className="title" style={{marginTop:16}}>Sam’s garden</h1><p className="body-copy" style={{margin:'10px 0 25px'}}>Grade 1 · Mathematics · Addition</p></div><div className="metric-row"><div className="metric"><b>{lessonFinished?'5 / 5':'0 / 5'}</b><small>Scenes seen</small></div><div className="metric"><b>{unlocked} / 4</b><small>Trail stops</small></div><div className="metric"><b>{practiceFinished?'6 / 6':`${practiceIndex} / 6`}</b><small>Practice</small></div></div><p className="note">Little Sprout is an interactive design prototype. Progress here is local to this preview.</p><button className="button" style={{marginTop:20}} onClick={()=>go('math')}>Explore my learning path <ArrowRight size={18}/></button></main>{navigation}</div>;

  if(screen==='math') return <div className="sprout"><main className="screen">{top('home','GRADE 1 · MATHEMATICS')}<div style={{marginTop:32}}><span className="pill"><BookOpen size={15}/> YOUR SCHOOL CURRICULUM</span><h1 className="hero-title">Math can be<br/><span style={{color:'var(--coral)'}}>an adventure.</span></h1><p className="body-copy" style={{marginTop:12}}>One little idea at a time. Today, we’re putting groups together.</p></div><div className="feature" style={{marginTop:30,background:'#f8e6d6',minHeight:320}}><span className="pill" style={{background:'#fff8e5'}}>TOPIC 01 · READY TO EXPLORE</span><h2>All about<br/>addition</h2><p>Five story scenes, an adventure trail, and a practice garden.</p><img src={bunny} alt="Bunny holding apples"/><button className="mini-cta" onClick={()=>go('intro')}>Open topic <ArrowRight size={15}/></button></div><div className="section-head"><h2>In this topic</h2></div><button className="curriculum-row" onClick={()=>go('intro')}><span className="row-icon"><Play size={21}/></span><span><strong>Meet addition</strong><small>5-scene illustrated lesson</small></span><ChevronRight size={18}/></button><button className="curriculum-row" onClick={()=>go('map')}><span className="row-icon" style={{background:'#e2ecdf'}}><Compass size={21}/></span><span><strong>Apple trail homework</strong><small>4 questions · unlock each stop</small></span><ChevronRight size={18}/></button><button className="curriculum-row" onClick={()=>go('practice')}><span className="row-icon" style={{background:'#eee4f2'}}><Star size={21}/></span><span><strong>Practice garden</strong><small>6 ways to show what you know</small></span><ChevronRight size={18}/></button></main>{navigation}</div>;

  if(screen==='intro') return <div className="sprout"><main className="screen">{top('math','ADDITION · LESSON')}<div style={{marginTop:28}}><span className="pill"><Play size={14}/> 5 LITTLE SCENES</span><h1 className="hero-title">Two apples.<br/><span style={{color:'var(--coral)'}}>Then two more!</span></h1><p className="body-copy" style={{marginTop:12}}>Join Bunny in the orchard and discover what happens when we put groups together.</p></div><div className="celebrate-art" style={{height:320,marginTop:25,background:'#e0eee1'}}><img src={bunny} alt="Your bunny guide in the orchard"/><div className="story-bubble" style={{position:'absolute',left:17,bottom:17,fontSize:19}}>2 + 2 = ?</div></div><div className="pill" style={{marginBottom:18}}>Swipe up through 5 scenes · then the story ends</div><button className="button coral" onClick={resetLesson}>Play the story <Play size={18} fill="currentColor"/></button><p className="note">Illustrated interactive storyboard preview · not a produced video</p></main></div>;

  if(screen==='complete'||screen==='treasure'||screen==='practiceDone') {
    const isLesson=screen==='complete', isTreasure=screen==='treasure';
    return <div className="sprout"><main className="screen">{top(isLesson?'math':isTreasure?'map':'practice',isLesson?'LESSON COMPLETE':isTreasure?'ADVENTURE COMPLETE':'PRACTICE COMPLETE')}<div className="celebrate"><span className="pill" style={{marginTop:22}}><Sparkles size={15}/> {isLesson?'FIVE SCENES FINISHED':isTreasure?'TREASURE FOUND':'SIX CHALLENGES FINISHED'}</span><h1 className="hero-title">{isLesson?'You did it, Sam!':isTreasure?'What a find!':'Look how you’ve grown!'}</h1><p className="body-copy" style={{marginTop:10}}>{isLesson?'You helped Bunny put apples together. Your homework trail is ready!':isTreasure?'Four stops, four puzzles, one wonderful explorer.':'You tried six different ways to add. That is real learning.'}</p><div className="celebrate-art"><img src={bunny} alt="Bunny celebrating"/><div className="sticker" style={{position:'absolute',right:23,bottom:19}}>{isTreasure?<Gift size={31}/>:<Medal size={31}/>}</div></div><div className="metric-row" style={{marginBottom:22}}><div className="metric"><b>{isLesson?'5 / 5':isTreasure?'4 / 4':'6 / 6'}</b><small>{isLesson?'Story scenes':isTreasure?'Trail stops':'Practice tasks'}</small></div><div className="metric"><b>{record.hints}</b><small>Helpful hints</small></div></div><button className="button coral" onClick={()=>{if(isLesson)go('map');else if(isTreasure){setPracticeIndex(0);go('practice');}else go('parent');}}>{isLesson?'Open homework adventure':isTreasure?'Try the practice garden':'Show a grown-up'} <ArrowRight size={18}/></button><button className="button secondary" style={{marginTop:13}} onClick={()=>go('home')}>Back to my garden</button></div></main></div>;
  }

  if(screen==='map') return <div className="sprout"><main className="screen scroll">{top('home','ADDITION · HOMEWORK')}<div style={{marginTop:25}}><span className="pill"><Compass size={15}/> APPLE TRAIL</span><h1 className="title" style={{marginTop:13}}>A little adventure<br/>is waiting!</h1><p className="body-copy" style={{marginTop:8}}>{lessonFinished?'Solve a puzzle at each stop to find Bunny’s treasure.':'Finish Bunny’s five-scene story to open this trail.'}</p></div><div className="map">{[0,1,2,3,4].map((i)=><button key={i} className={`map-stop ${lessonFinished&&i===unlocked?'active':''} ${!lessonFinished||i>unlocked?'locked':''}`} style={{cursor:lessonFinished&&i<=unlocked?'pointer':'not-allowed'}} onClick={()=>i===4?lessonFinished&&unlocked>=4&&go('treasure'):openHomeworkStop(i)} aria-label={i===4?'Treasure':`Question ${i+1}, ${!lessonFinished||i>unlocked?'locked':'available'}`}>{i===4?<Gift size={28}/>:!lessonFinished||i>unlocked?<LockKeyhole size={24}/>:i<unlocked?<Check size={26}/>:<Apple size={27}/>}<span>{i===4?'Treasure':`Stop ${i+1}`}</span></button>)}</div><p className="note">{!lessonFinished?'The adventure unlocks when the lesson ends.':unlocked===4?'The treasure is yours!':`Stop ${Math.min(unlocked+1,4)} of 4 is ready. Each answer opens the next stop.`}</p><button className="button coral" onClick={()=>!lessonFinished?go('intro'):unlocked>=4?go('treasure'):openHomeworkStop(unlocked)}>{!lessonFinished?'Start the addition story':unlocked>=4?'See your treasure':`Go to stop ${unlocked+1}`} <ArrowRight size={18}/></button></main>{navigation}</div>;

  if(screen==='question') { const q=homework[stop]; return <div className="sprout"><main className="screen">{top('map',`HOMEWORK · STOP ${stop+1} / 4`)}<div style={{marginTop:27}}><span className="pill"><Compass size={15}/> {q.place.toUpperCase()}</span><h1 className="title" style={{marginTop:14}}>Help Bunny count!</h1><p className="body-copy" style={{marginTop:8}}>How many apples are there altogether?</p></div><div className="question-panel"><div className="apple-groups"><Apples count={q.a}/><span className="operator">+</span><Apples count={q.b}/></div><h2>{q.equation} = ?</h2>{feedback&&<CountHint a={q.a} b={q.b}/>}<div className="answer-options">{q.options.map(n=><button key={n} onClick={()=>solve(n,q.answer,finishHomeworkStop)}>{n}</button>)}</div></div><button className="button secondary" style={{marginTop:18}} onClick={moreHelp}><CircleHelp size={18}/> Show me how to count</button><p className="note">Take your time. You can try as many times as you need.</p></main></div>; }

  if(screen==='practice') { const p=practices[practiceIndex]; return <div className="sprout"><main className="screen">{top('home','PRACTICE GARDEN')}<div style={{marginTop:22}}><span className="pill"><Star size={15}/> CHALLENGE {practiceIndex+1} OF 6</span><div style={{height:7,background:'#e4eadf',borderRadius:10,margin:'17px 0 25px'}}><div style={{width:`${((practiceIndex+1)/6)*100}%`,height:'100%',background:'var(--forest)',borderRadius:10}}/></div><span className="eyebrow">{p.kind.toUpperCase()}</span><h1 className="title" style={{marginTop:9}}>{p.title}</h1><p className="body-copy" style={{marginTop:7}}>{practiceIndex===1?'Tap a number to move it into the answer spot.':practiceIndex===2?'Which number belongs with this equation?':practiceIndex===5?'Tap each number in order. Tap a chosen number to undo.':'Show Bunny what you know.'}</p></div><div className="practice-visual">{practiceIndex<5?<><div className="apple-groups"><Apples count={p.a}/><span className="operator">+</span><Apples count={p.b}/></div>{practiceIndex===1&&<div className="selected-sequence">{selection||'Tap a number below ↑'}</div>}</>:<div className="selected-sequence">{order.length?order.join('  →  '):'Tap smallest first'}</div>}</div>{feedback&&<div style={{marginBottom:12}}><CountHint a={p.a||1} b={p.b||2}/></div>}
    {practiceIndex===4?<input className="practice-input" inputMode="numeric" placeholder="?" aria-label="Your answer" value={selection} onChange={e=>setSelection(e.target.value.replace(/[^0-9]/g,''))}/>:practiceIndex===5?<div className="chip-row">{p.choices.filter(v=>!order.includes(v)).map(v=><button key={v} onClick={()=>setOrder(o=>[...o,v])}>{v}</button>)}{order.length>0&&<button onClick={()=>setOrder(o=>o.slice(0,-1))} aria-label="Undo last number"><RotateCcw size={22}/></button>}</div>:<div className="answer-options">{p.choices.map(v=><button className={selection===v?'selected':''} style={selection===v?{borderColor:'#397567',background:'#d9efe2'}:{}} key={v} onClick={()=>setSelection(v)}>{v}</button>)}</div>}
    <button className="button coral" style={{marginTop:24}} disabled={practiceIndex===5?order.length!==3:!selection} onClick={practiceNext}>{practiceIndex===5?'Finish practice':'Check my answer'}<ArrowRight size={18}/></button><button className="button secondary" style={{marginTop:14}} onClick={moreHelp}><CircleHelp size={18}/> I’d like a hint</button><p className="note">Tap instead of dragging · every try helps you learn</p></main>{navigation}</div>; }

  const parentData={independent:record.independent||7,hints:record.hints||3,explanations:record.explanations||1,attempts:record.attempts||12};
  if(screen==='parent') return <div className="sprout parent-mode"><main className="screen scroll"><div className="topbar"><div><span className="eyebrow">LITTLE SPROUT · FAMILY VIEW</span><h1 className="title" style={{marginTop:4}}>Sam’s learning</h1></div><button className="avatar" onClick={()=>go('profile')}>S</button></div><p className="body-copy" style={{marginTop:10}}>A clear look at the little steps behind the big progress.</p><div className="parent-card" style={{marginTop:22,background:'#dcece1',border:0}}><span className="eyebrow">TODAY’S SNAPSHOT</span><h2 style={{fontSize:25,margin:'7px 0 13px'}}>Addition is taking root.</h2><p style={{fontSize:13,lineHeight:1.5}}>Sam understands combining small groups. Counting on with larger sums is a good next step.</p></div><div className="section-head"><h2>Today’s activity</h2><span className="eyebrow">GRADE 1 MATH</span></div><div className="parent-card" style={{marginTop:0}}><div className="activity"><span className="activity-icon"><Play size={18}/></span><span><b>Lesson · Putting groups together</b><small>{lessonFinished?'5 of 5 scenes completed':'Sample: 5 of 5 scenes completed'}</small></span></div><div className="activity"><span className="activity-icon" style={{background:'#f7e5d9'}}><Compass size={18}/></span><span><b>Homework · Apple trail</b><small>{homeworkFinished?'4 of 4 stops completed':`Sample: 4 of 4 stops · local: ${unlocked} completed`}</small></span></div><div className="activity"><span className="activity-icon" style={{background:'#eae4f2'}}><Star size={18}/></span><span><b>Practice · Six question styles</b><small>{practiceFinished?'6 of 6 completed':`Sample: 6 of 6 · local: ${practiceIndex} completed`}</small></span></div></div><div className="section-head"><h2>How Sam learned</h2><button className="text-link" onClick={()=>go('insights')}>Full insights</button></div><div className="metric-row"><div className="metric"><b>{parentData.independent}</b><small>On own</small></div><div className="metric"><b>{parentData.hints}</b><small>Hints used</small></div><div className="metric"><b>{parentData.attempts}</b><small>Attempts</small></div></div><div className="parent-card"><div className="insight"><span className="insight-dot"/><span><b>Strong · Counting objects</b><small>Sam counts visible apples confidently.</small></span></div><div className="insight"><span className="insight-dot amber"/><span><b>Growing · Sums up to 10</b><small>More practice combining larger groups will help.</small></span></div></div><button className="button" style={{marginTop:18}} onClick={()=>go('insights')}>Explore learning insights <ArrowRight size={18}/></button><p className="note">Prototype · Example family insights are sample data. This preview’s interaction counts are local and reset on refresh.</p></main>{navigation}</div>;
  if(screen==='insights') return <div className="sprout parent-mode"><main className="screen scroll">{top('parent','LEARNING INSIGHTS')}<div style={{marginTop:28}}><span className="pill"><Heart size={15}/> A CLOSER LOOK AT SAM’S LEARNING</span><h1 className="title" style={{marginTop:15}}>More than a score.</h1><p className="body-copy" style={{marginTop:9}}>Here’s where Sam feels confident and where a little extra time could help.</p></div><div className="parent-card" style={{marginTop:25}}><h3>Concepts in focus</h3><div className="insight"><span className="insight-dot"/><span><b>Strong · Counting objects</b><small>Can count and combine two small visible groups.</small></span></div><div className="insight"><span className="insight-dot amber"/><span><b>Needs practice · Addition up to 10</b><small>Benefits from seeing each object while solving 4 + 3 and 5 + 3.</small></span></div><div className="insight"><span className="insight-dot coral"/><span><b>Keep an eye on · Story problems</b><small>Needs support turning a short story into an equation.</small></span></div></div><div className="parent-card"><h3>How Sam solved</h3><div className="metric-row"><div className="metric"><b>{parentData.independent}</b><small>Independent</small></div><div className="metric"><b>{parentData.hints}</b><small>With a hint</small></div><div className="metric"><b>{parentData.explanations}</b><small>Explanations</small></div></div><p className="body-copy" style={{fontSize:12,marginTop:16}}>Across {parentData.attempts} attempts, supportive visual counting helped Sam try again. Hints are part of learning, not a penalty.</p></div><div className="parent-card" style={{background:'#e2eee5'}}><h3>Try together next</h3><p className="body-copy" style={{fontSize:13}}>Put 4 small objects next to 3 more and let Sam count every object out loud. Then ask, “How many altogether?”</p></div><button className="button" style={{marginTop:20}} onClick={()=>go('parent')}>Back to dashboard</button><p className="note">Prototype · Concept insights are labeled sample data; session interaction counts are simulated locally.</p></main>{navigation}</div>;
  return null;
}