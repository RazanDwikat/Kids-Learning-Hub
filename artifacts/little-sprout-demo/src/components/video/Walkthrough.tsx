import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSceneTimer } from '@/lib/video';

export const TOUR = [
 {key:'home',title:'Start in the learning garden',label:'HOME & LEARNING PATH',ms:9050,steps:[
  ['Home brings the story, homework and practice together.','home'],
  ['The next adventure is Grade 1 mathematics: addition.','learn'],
  ['Choose Start learning to open the five-scene bunny story.','intro']]},
 {key:'story',title:'Watch the addition story',label:'THE BUNNY STORY',ms:9600,steps:[
  ['The lesson begins with two animated story scenes.','story'],
  ['Bunny’s orchard story introduces putting two groups together.','story2'],
  ['Play, pause, replay or mute. Use Next scene to continue.','story2']]},
 {key:'interact',title:'Try it with your hands',label:'DRAG, COUNT & ANSWER',ms:9000,steps:[
  ['Move the apples into Bunny’s group. Drag them, or tap instead.','drag'],
  ['Choose an answer: three apples plus two more makes five.','choice'],
  ['Need help? Show me how to count explains the groups.','hint']]},
 {key:'review',title:'Finish, then revisit',label:'COMPLETION & REVIEW',ms:8400,steps:[
  ['Complete all five story scenes to finish the lesson.','complete'],
  ['Review the story starts a fresh set of interactions.','review'],
  ['Saved completion stays at 5/5 while the review begins again.','home-complete']]},
 {key:'homework',title:'Choose the homework page',label:'TEXTBOOK HOMEWORK',ms:9600,steps:[
  ['Open Homework and choose a textbook page.','homework'],
  ['Pages 4, 5, 7 and 8 contain written homework questions.','page4'],
  ['Review the question preview, then Start this homework.','page4']]},
 {key:'adventure',title:'Follow Bunny’s adventure',label:'FROM PAGE TO TRAIL',ms:7800,steps:[
  ['The selected textbook page becomes a question-by-question trail.','map'],
  ['Open the current stop and solve its addition question.','question'],
  ['Finishing Homework or an Exam can award a selected reward.','map']]},
 {key:'practice',title:'Practice or take an exam',label:'TWO WAYS TO KEEP LEARNING',ms:9000,steps:[
  ['Practice is a separate space to work on addition.','practice'],
  ['Switch to Exam for the treasure adventure.','exam'],
  ['Saved unfinished adventures can be continued later.','homework']]},
 {key:'rewards',title:'Choose the celebrations',label:'GROWN-UP · DASHBOARD',ms:9600,steps:[
  ['The Dashboard reward pool shows which rewards are selected.','reward-dashboard'],
  ['Add a title and message for a celebration your child will enjoy.','reward-form'],
  ['Manage rewards to edit, remove or select future celebrations.','reward-list']]},
 {key:'progress',title:'See the learning behind the score',label:'CHILD PROGRESS & INSIGHTS',ms:9600,steps:[
  ['Child progress brings together story and activity completion.','progress'],
  ['Insights uses saved answers to show strengths and practice needs.','insights'],
  ['Hints, explanations and independent answers add context.','insights']]},
 {key:'scope',title:'What’s ready today',label:'PROJECT SCOPE',ms:8350,steps:[
  ['Ready now: addition stories, textbook homework, practice and exams.','home'],
  ['Scan homework is visible, but automatic page recognition is not connected.','scan'],
  ['Learning stays with this device profile. Cross-device account sync is not available.','home-complete']]},
] as const;

export function Walkthrough({index}:{index:number}){
 const shot=TOUR[index];const [beat,setBeat]=useState(0);
 useSceneTimer([{time:Math.round(shot.ms/3),callback:()=>setBeat(1)},{time:Math.round(shot.ms*2/3),callback:()=>setBeat(2)}]);
 const current=shot.steps[beat];
 return <motion.section className="tour-scene" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.35}}>
  <header className="tour-header"><div className="brand">little sprout<b>.</b></div><span>PROJECT WALKTHROUGH <i/> {String(index+1).padStart(2,'0')} / 10</span></header>
  <div className="tour-copy">
   <div className="tour-chapter"><span>{String(index+1).padStart(2,'0')}</span><p>{shot.label}</p></div>
   <h1>{shot.title}</h1>
   <div className="tour-instructions">
    {shot.steps.map(([caption],i)=><motion.div className={`tour-step ${beat===i?'active':''}`} key={caption} animate={{opacity:beat===i?1:.3}} transition={{duration:.3}}><span className="tour-step-num">{i+1}</span><p>{caption}</p></motion.div>)}
   </div>
   <div className="tour-note"><span/> {index<7?'CHILD’S LEARNING JOURNEY':index<9?'FAMILY VIEW':'CURRENT PROJECT CAPABILITIES'}</div>
  </div>
  <div className="tour-product"><div className="tour-product-label"><span className="live-dot"/> ACTUAL PROJECT SCREENS <span>{beat+1} / 3</span></div><div className="tour-screen">
   <AnimatePresence mode="sync"><motion.img key={current[1]} src={`${import.meta.env.BASE_URL}walkthrough/${current[1]}.png`} alt={`Little Sprout: ${current[0]}`} initial={{opacity:0,scale:1.018}} animate={{opacity:1,scale:1}} exit={{opacity:0}} transition={{duration:.45}}/></AnimatePresence>
  </div><div className="tour-image-caption">{index===7?'Example reward configured in a separate demo profile':'Captured from Little Sprout · separate demo device profile'}</div></div>
  <footer className="tour-footer"><span>{index===9?'Big discoveries start with little steps.':'A guided tour of the working project'}</span><div>{TOUR.map((s,i)=><span key={s.key} className={i===index?'current':i<index?'seen':''}>{i===index&&<motion.i initial={{scaleX:0}} animate={{scaleX:1}} transition={{duration:shot.ms/1000,ease:'linear'}}/>}</span>)}</div><b>01:30</b></footer>
 </motion.section>
}
