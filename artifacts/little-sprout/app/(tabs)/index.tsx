import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Image } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';

const C = colors.light;
const bunny = require('../../assets/images/sprout-bunny.png');
const orchard = require('../../assets/images/sprout-orchard.png');
type Screen = 'home' | 'profile' | 'math' | 'intro' | 'lesson' | 'complete' | 'map' | 'question' | 'treasure' | 'practice' | 'practiceDone' | 'parent' | 'insights';
type IconName = React.ComponentProps<typeof Feather>['name'];
const chapters = [
  { title: 'A little apple story', caption: 'Bunny has 2 apples. Mama brings 2 more!', color: '#dceee3' },
  { title: 'Put them together!', caption: 'Addition makes one big group.', color: '#f9e8d4' },
  { title: 'Your turn to help', caption: 'Move the apples over to Bunny.', color: '#eae2f2' },
  { title: 'Count with Bunny', caption: 'How many apples altogether?', color: '#fff0c9' },
  { title: 'Bunny’s big challenge', caption: 'One last little puzzle!', color: '#d5eddf' },
];
const homework = [
  { name: 'Apple tree', a: 2, b: 1, options: [2, 3, 4] },
  { name: 'Little bridge', a: 3, b: 2, options: [4, 5, 6] },
  { name: 'Flower field', a: 4, b: 2, options: [5, 6, 7] },
  { name: 'Treasure hill', a: 5, b: 3, options: [7, 8, 9] },
];
const tasks = [
  { kind: 'CHOOSE AN ANSWER', title: '2 + 3 = ?', a: 2, b: 3, answer: '5', choices: ['4', '5', '6'] },
  { kind: 'MOVE A NUMBER', title: '3 + 3 = ?', a: 3, b: 3, answer: '6', choices: ['5', '6', '7'] },
  { kind: 'MAKE A MATCH', title: 'Match 2 + 2', a: 2, b: 2, answer: '4', choices: ['3', '4', '5'] },
  { kind: 'COUNT THE APPLES', title: 'How many altogether?', a: 4, b: 3, answer: '7', choices: ['6', '7', '8'] },
  { kind: 'WRITE THE ANSWER', title: '4 + 3 = ?', a: 4, b: 3, answer: '7', choices: [] },
  { kind: 'PUT IN ORDER', title: 'Smallest to biggest', a: 0, b: 0, answer: '3,4,5', choices: ['5', '3', '4'] },
];
function Txt({ children, style, ...props }: React.ComponentProps<typeof Text>) {
  return <Text {...props} style={[s.body, style]}>{children}</Text>;
}
function Icon({ name, size = 21, color = C.primary }: { name: IconName; size?: number; color?: string }) {
  return <Feather name={name} size={size} color={color} />;
}
function Button({ title, onPress, secondary = false, disabled = false, coral = false, icon, style }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; coral?: boolean; icon?: IconName; style?: object }) {
  return <Pressable testID={`button-${title.replace(/\s+/g, '-').toLowerCase()}`} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondaryButton, coral && s.coralButton, disabled && { opacity: .45 }, pressed && { transform: [{ translateY: 3 }], opacity: .88 }, style]}>
    <Txt style={[s.buttonText, secondary && { color: C.primary }]}>{title}</Txt>{icon && <Icon name={icon} size={18} color={secondary ? C.primary : C.paper} />}
  </Pressable>;
}
function Apples({ count, size = 37 }: { count: number; size?: number }) {
  return <View accessibilityLabel={`${count} apples`} style={s.apples}>{Array.from({ length: count }, (_, i) => <MaterialCommunityIcons key={i} name="food-apple" size={size} color={C.coral} style={{ marginHorizontal: -2 }} />)}</View>;
}
function Hint({ a, b }: { a: number; b: number }) {
  return <View style={s.hint}><Txt style={s.hintTitle}>Almost! Let's count together.</Txt><Txt style={s.smallMuted}>Touch each apple as you count. You've got this!</Txt><Apples count={a + b} size={26} /></View>;
}
function DragItem({ label, apple = false, onDrop }: { label?: string; apple?: boolean; onDrop: () => void }) {
  const offset = useRef(new Animated.ValueXY()).current;
  const moved = useRef(false);
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => { if (Math.abs(gesture.dx) + Math.abs(gesture.dy) > 8) moved.current = true; offset.setValue({ x: gesture.dx, y: gesture.dy }); },
    onPanResponderRelease: (_, gesture) => {
      if (moved.current && (Math.abs(gesture.dx) > 45 || Math.abs(gesture.dy) > 45)) onDrop();
      else if (!moved.current) onDrop();
      moved.current = false;
      Animated.spring(offset, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
    },
  })).current;
  return <Animated.View {...responder.panHandlers} style={[s.dragItem, { transform: offset.getTranslateTransform() }]}>
    {apple ? <MaterialCommunityIcons name="food-apple" size={37} color={C.coral} /> : <Txt style={s.answerText}>{label}</Txt>}
  </Animated.View>;
}
function Metric({ value, label, tint }: { value: string | number; label: string; tint?: string }) {
  return <View style={[s.metric, tint ? { backgroundColor: tint } : null]}><Txt style={s.metricNumber}>{value}</Txt><Txt style={s.metricLabel}>{label}</Txt></View>;
}
function InsightRow({ title, detail, color }: { title: string; detail: string; color: string }) {
  return <View style={s.insightRow}><View style={[s.dot, { backgroundColor: color }]} /><View style={{ flex: 1 }}><Txt style={s.rowTitle}>{title}</Txt><Txt style={s.smallMuted}>{detail}</Txt></View></View>;
}

export default function LittleSprout() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomInset = Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;
  const [screen, setScreen] = useState<Screen>('home');
  const [chapter, setChapter] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [moved, setMoved] = useState(0);
  const [solved, setSolved] = useState(false);
  const [lessonFinished, setLessonFinished] = useState(false);
  const [unlocked, setUnlocked] = useState(0);
  const [stop, setStop] = useState(0);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [selection, setSelection] = useState('');
  const [order, setOrder] = useState<string[]>([]);
  const [feedback, setFeedback] = useState(false);
  const [assisted, setAssisted] = useState(false);
  const [record, setRecord] = useState({ independent: 0, hints: 0, explanations: 0, attempts: 0 });
  const touchStart = useRef<number | null>(null);
  const go = (destination: Screen) => { setFeedback(false); setAssisted(false); setScreen(destination); };
  const resetLesson = () => { setChapter(0); setMoved(0); setSolved(false); setVideoProgress(0); setPlaying(true); go('lesson'); };
  const changeChapter = (next: number) => {
    setFeedback(false); setAssisted(false); setSolved(false); setMoved(0); setVideoProgress(0); setPlaying(true);
    if (next === 5) { setLessonFinished(true); setScreen('complete'); }
    else if (next < 0) setScreen('intro');
    else setChapter(next);
  };
  const answer = (value: number, correct: number, done: () => void) => {
    setRecord(r => ({ ...r, attempts: r.attempts + 1, independent: r.independent + (value === correct && !assisted ? 1 : 0), hints: r.hints + (value !== correct ? 1 : 0) }));
    if (value === correct) { setFeedback(false); done(); }
    else { setFeedback(true); setAssisted(true); }
  };
  const help = () => { setFeedback(true); setAssisted(true); setRecord(r => ({ ...r, explanations: r.explanations + 1 })); };
  const openStop = (i: number) => { if (lessonFinished && i <= unlocked && i < 4) { setStop(i); go('question'); } };
  const finishStop = () => { setUnlocked(Math.max(unlocked, stop + 1)); if (stop === 3) go('treasure'); else go('map'); };
  const checkPractice = () => {
    const target = tasks[practiceIndex].answer;
    const actual = practiceIndex === 5 ? order.join(',') : selection.trim();
    setRecord(r => ({ ...r, attempts: r.attempts + 1, independent: r.independent + (actual === target && !assisted ? 1 : 0), hints: r.hints + (actual !== target ? 1 : 0) }));
    if (actual !== target) { setFeedback(true); setAssisted(true); return; }
    setFeedback(false); setAssisted(false); setSelection(''); setOrder([]);
    if (practiceIndex === 5) go('practiceDone'); else setPracticeIndex(i => i + 1);
  };
  useEffect(() => {
    if (screen !== 'lesson' || !playing || videoProgress >= 100) return;
    const id = setInterval(() => setVideoProgress(p => Math.min(100, p + 2)), 110);
    return () => clearInterval(id);
  }, [screen, playing, videoProgress, chapter]);
  const chrome = (back: Screen, label: string) => <View style={s.topbar}><Pressable accessibilityLabel="Go back" onPress={() => go(back)} style={s.back}><Icon name="arrow-left" /></Pressable><Txt style={s.eyebrow}>{label}</Txt><View style={{ width: 42 }} /></View>;
  const nav = <View style={[s.nav, { paddingBottom: bottomInset, height: 65 + bottomInset }]}>
    {([['home', 'home', 'Home'], ['math', 'book-open', 'Learn'], ['map', 'compass', 'Homework'], ['practice', 'star', 'Practice'], ['parent', 'user', 'Grown-up']] as [Screen, IconName, string][]).map(([dest, icon, label]) => <Pressable key={dest} onPress={() => go(dest)} style={s.navItem}><Icon name={icon} size={20} color={screen === dest ? C.primary : C.mutedForeground} /><Txt style={[s.navLabel, screen === dest && { color: C.primary }]}>{label}</Txt></Pressable>)}
  </View>;
  const page = (children: React.ReactNode, withNav = false, parent = false) => <View style={[s.root, parent && { backgroundColor: '#f6f5ed' }]}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.page, { paddingTop: topInset + 15, paddingBottom: (withNav ? 85 : 30) + bottomInset }]}>{children}</ScrollView>{withNav && nav}</View>;
  const sectionTitle = (title: string) => <Txt style={s.sectionTitle}>{title}</Txt>;
  const feature = (background: string, heading: string, detail: string, cta: string, action: () => void) => <View style={[s.feature, { backgroundColor: background }]}><Txt style={s.pill}>✦  YOUR NEXT ADVENTURE</Txt><Txt style={s.featureTitle}>{heading}</Txt><Txt style={s.featureDetail}>{detail}</Txt><Image source={bunny} style={s.featureBunny} resizeMode="contain" /><Pressable style={s.featureCta} onPress={action}><Txt style={s.featureCtaText}>{cta}  →</Txt></Pressable></View>;
  const canNext = chapter < 2 || solved || (chapter === 2 && moved === 2);

  if (screen === 'lesson') return <View style={[s.lesson, { backgroundColor: chapters[chapter].color, paddingTop: topInset + 10, paddingBottom: bottomInset + 13 }]} onTouchStart={e => { touchStart.current = e.nativeEvent.pageY; }} onTouchEnd={e => {
    if (touchStart.current === null) return;
    const delta = touchStart.current - e.nativeEvent.pageY; touchStart.current = null;
    if (delta > 75 && canNext) changeChapter(chapter + 1);
    else if (delta < -75) changeChapter(chapter - 1);
  }}>
    <View style={s.lessonTop}><Pressable style={s.back} onPress={() => go('intro')}><Icon name="x" /></Pressable><View style={s.progressDots}>{chapters.map((_, i) => <View key={i} style={[s.progressDot, i <= chapter && { backgroundColor: C.primary }]} />)}</View><Txt style={s.countBadge}>{chapter + 1} / 5</Txt></View>
    <View style={s.lessonHeading}><Txt style={s.eyebrow}>STORYBOARD · ADDITION</Txt><Txt style={s.lessonTitle}>{chapters[chapter].title}</Txt><Txt style={s.lessonCaption}>{chapters[chapter].caption}</Txt></View>
    <View style={s.lessonArt}>
      {chapter === 0 && <><Image source={orchard} resizeMode="contain" style={s.orchard} /><Txt style={s.bubble}>2 + 2 = 4</Txt></>}
      {chapter === 1 && <><View style={s.appleRow}><Apples count={2} /><Txt style={s.operator}>+</Txt><Apples count={2} /></View><Txt style={s.equation}>2 + 2 = 4</Txt><Txt style={s.bubble}>Two groups become one!</Txt></>}
      {chapter === 2 && <><Image source={bunny} resizeMode="contain" style={s.lessonBunny} /><View style={s.appleRow}><Apples count={2 + moved} size={32} /><Txt style={s.operator}>←</Txt><View style={s.apples}>{Array.from({ length: 2 - moved }, (_, i) => <DragItem key={i} apple onDrop={() => setMoved(v => Math.min(2, v + 1))} />)}</View></View><Txt style={s.lessonCaption}>{moved === 2 ? 'Wonderful! 2 + 2 = 4' : 'Drag an apple left, or tap it!'}</Txt></>}
      {chapter === 3 && <><View style={s.appleRow}><Apples count={3} /><Txt style={s.operator}>+</Txt><Apples count={2} /></View><Txt style={s.equation}>3 + 2 = ?</Txt>{feedback && <Hint a={3} b={2} />}</>}
      {chapter === 4 && <><Image source={bunny} resizeMode="contain" style={s.lessonBunny} /><Txt style={s.equation}>4 + 3 = ?</Txt>{feedback && <Hint a={4} b={3} />}</>}
    </View>
    <View style={s.lessonBottom}>
      {(chapter === 3 || chapter === 4) && !solved && <View style={s.choices}>{(chapter === 3 ? [4, 5, 6] : [6, 7, 8]).map(n => <Pressable style={s.choice} key={n} onPress={() => answer(n, chapter === 3 ? 5 : 7, () => setSolved(true))}><Txt style={s.answerText}>{n}</Txt></Pressable>)}</View>}
      {solved && <Txt style={s.pill}>✓  Yes! You counted them all.</Txt>}
      <View style={s.controls}><Pressable accessibilityLabel={playing ? 'Pause storyboard' : 'Play storyboard'} onPress={() => setPlaying(v => !v)} style={s.playButton}><Icon name={playing ? 'pause' : 'play'} /></Pressable><Button coral title={chapter === 4 ? 'Finish lesson' : 'Next scene'} onPress={() => changeChapter(chapter + 1)} disabled={!canNext} icon="arrow-right" style={{ flex: 1 }} /></View>
      <Txt style={s.swipeTip}>{canNext ? '↑ Swipe up or tap Next · 5 scenes only' : 'Try the activity to continue'}</Txt>
      <View style={s.track}><View style={[s.trackFill, { width: `${videoProgress}%` }]} /></View>
    </View>
  </View>;

  if (screen === 'home') return page(<><View style={s.topbar}><Txt style={s.brand}>✦ little sprout<Txt style={{ color: C.coral }}>.</Txt></Txt><Pressable style={s.avatar} onPress={() => go('profile')}><Txt style={s.avatarText}>S</Txt></Pressable></View><Txt style={[s.eyebrow, { marginTop: 27 }]}>YOUR LEARNING GARDEN</Txt><Txt style={s.hero}>Hello, Sam!{'\n'}<Txt style={{ color: C.coral }}>Ready to grow?</Txt></Txt>{feature('#d9eee1', 'Let’s add\napples!', 'Grade 1 · Mathematics\nA five-scene bunny story', 'Start learning', () => go('intro'))}{sectionTitle('Pick a path')}<View style={s.tileRow}><Pressable style={[s.tile, { backgroundColor: '#f8ddd0' }]} onPress={() => go('map')}><Icon name="compass" /><Txt style={s.tileTitle}>Homework{'\n'}adventure</Txt><Txt style={s.smallMuted}>{lessonFinished ? '4 stops await' : 'Explore the trail'}</Txt></Pressable><Pressable style={[s.tile, { backgroundColor: C.lilac }]} onPress={() => go('practice')}><Icon name="star" /><Txt style={s.tileTitle}>Practice{'\n'}garden</Txt><Txt style={s.smallMuted}>6 little challenges</Txt></Pressable></View>{sectionTitle('Your school path')}<Pressable style={s.curriculum} onPress={() => go('math')}><Icon name="book-open" /><View style={{ flex: 1 }}><Txt style={s.rowTitle}>Grade 1 Mathematics</Txt><Txt style={s.smallMuted}>We’re learning addition</Txt></View><Icon name="chevron-right" /></Pressable></>, true);
  if (screen === 'profile') return page(<>{chrome('home', 'YOUR PROFILE')}<View style={s.celebrateArt}><Image source={bunny} resizeMode="contain" style={s.celebrateBunny} /></View><Txt style={[s.pill, { alignSelf: 'center' }]}>LITTLE LEARNER</Txt><Txt style={[s.title, s.center, { marginTop: 16 }]}>Sam’s garden</Txt><Txt style={[s.muted, s.center]}>Grade 1 · Mathematics · Addition</Txt><View style={s.metricRow}><Metric value={lessonFinished ? '5 / 5' : `${chapter} / 5`} label="Scenes seen" /><Metric value={`${unlocked} / 4`} label="Trail stops" tint="#f9e5d6" /><Metric value={`${practiceIndex} / 6`} label="Practice" tint={C.lilac} /></View><Txt style={s.note}>Illustrated storyboard prototype, not produced video. Progress stays in this session only.</Txt><Button title="Explore my learning path" onPress={() => go('math')} icon="arrow-right" /></>, true);
  if (screen === 'math') return page(<>{chrome('home', 'GRADE 1 · MATHEMATICS')}<Txt style={[s.pill, { marginTop: 27, alignSelf: 'flex-start' }]}>YOUR SCHOOL CURRICULUM</Txt><Txt style={s.hero}>Math can be{'\n'}<Txt style={{ color: C.coral }}>an adventure.</Txt></Txt><Txt style={s.muted}>One little idea at a time. Today we’re putting groups together.</Txt>{feature('#f8e6d6', 'All about\naddition', 'Five story scenes, an adventure trail, and a practice garden.', 'Open topic', () => go('intro'))}{sectionTitle('In this topic')}{([['Meet addition', '5-scene illustrated lesson', 'intro', 'play'], ['Apple trail homework', '4 questions · unlock each stop', 'map', 'compass'], ['Practice garden', '6 ways to show what you know', 'practice', 'star']] as [string, string, Screen, IconName][]).map(([title, sub, dest, icon]) => <Pressable key={title} style={s.curriculum} onPress={() => go(dest)}><Icon name={icon} /><View style={{ flex: 1 }}><Txt style={s.rowTitle}>{title}</Txt><Txt style={s.smallMuted}>{sub}</Txt></View><Icon name="chevron-right" /></Pressable>)}</>, true);
  if (screen === 'intro') return page(<>{chrome('math', 'ADDITION · LESSON')}<Txt style={[s.pill, { marginTop: 28, alignSelf: 'flex-start' }]}>5 LITTLE SCENES</Txt><Txt style={s.hero}>Two apples.{'\n'}<Txt style={{ color: C.coral }}>Then two more!</Txt></Txt><Txt style={s.muted}>Join Bunny in the orchard and put two little groups together.</Txt><View style={s.celebrateArt}><Image source={bunny} style={s.celebrateBunny} resizeMode="contain" /><Txt style={[s.bubble, { position: 'absolute', bottom: 16, left: 16 }]}>2 + 2 = ?</Txt></View><Txt style={[s.pill, { alignSelf: 'flex-start', marginBottom: 15 }]}>Swipe up through 5 scenes · then the story ends</Txt><Button title="Play the story" coral icon="play" onPress={resetLesson} /><Txt style={s.note}>Interactive animated storyboard preview · not a produced video or voice recording.</Txt></>);
  if (screen === 'complete' || screen === 'treasure' || screen === 'practiceDone') {
    const lesson = screen === 'complete', treasure = screen === 'treasure';
    return page(<>{chrome(lesson ? 'math' : treasure ? 'map' : 'practice', lesson ? 'LESSON COMPLETE' : treasure ? 'ADVENTURE COMPLETE' : 'PRACTICE COMPLETE')}<Txt style={[s.pill, { marginTop: 28, alignSelf: 'center' }]}>{lesson ? 'FIVE SCENES FINISHED' : treasure ? 'TREASURE FOUND' : 'SIX CHALLENGES FINISHED'}</Txt><Txt style={[s.hero, s.center]}>{lesson ? 'You did it, Sam!' : treasure ? 'What a find!' : 'Look how you’ve grown!'}</Txt><Txt style={[s.muted, s.center]}>{lesson ? 'You helped Bunny put apples together. Your homework trail is ready!' : treasure ? 'Four stops, four puzzles, one wonderful explorer.' : 'You tried six different ways to add. That is real learning.'}</Txt><View style={s.celebrateArt}><Image source={bunny} resizeMode="contain" style={s.celebrateBunny} /><View style={s.sticker}><Icon name={treasure ? 'gift' : 'award'} size={30} /></View></View><View style={s.metricRow}><Metric value={lesson ? '5 / 5' : treasure ? '4 / 4' : '6 / 6'} label={lesson ? 'Story scenes' : treasure ? 'Trail stops' : 'Practice tasks'} /><Metric value={record.hints} label="Helpful hints" tint="#f9e5d6" /></View><Button coral title={lesson ? 'Open homework adventure' : treasure ? 'Try the practice garden' : 'Show a grown-up'} icon="arrow-right" onPress={() => { if (lesson) go('map'); else if (treasure) { setPracticeIndex(0); go('practice'); } else go('parent'); }} /><Button secondary title="Back to my garden" onPress={() => go('home')} style={{ marginTop: 12 }} /></>);
  }
  if (screen === 'map') return page(<>{chrome('home', 'ADDITION · HOMEWORK')}<Txt style={[s.pill, { marginTop: 23, alignSelf: 'flex-start' }]}>APPLE TRAIL</Txt><Txt style={[s.title, { marginTop: 12 }]}>A little adventure{'\n'}is waiting!</Txt><Txt style={s.muted}>{lessonFinished ? 'Solve a puzzle at each stop to find Bunny’s treasure.' : 'Finish Bunny’s five-scene story to open this trail.'}</Txt><View style={s.map}><View style={s.mapPath} />{[0, 1, 2, 3, 4].map(i => <Pressable key={i} disabled={!lessonFinished || i > unlocked} onPress={() => i === 4 ? go('treasure') : openStop(i)} style={[s.mapStop, { top: `${[7, 25, 44, 62, 79][i]}%`, left: i % 2 === 0 ? '13%' : '64%', opacity: !lessonFinished || i > unlocked ? .55 : 1, backgroundColor: lessonFinished && i === unlocked ? C.butter : C.paper }]}><Icon name={i === 4 ? 'gift' : i > unlocked || !lessonFinished ? 'lock' : i < unlocked ? 'check' : 'circle'} size={25} /><Txt style={s.mapLabel}>{i === 4 ? 'Treasure' : `Stop ${i + 1}`}</Txt></Pressable>)}</View><Txt style={s.note}>{!lessonFinished ? 'The trail unlocks when the lesson ends.' : unlocked === 4 ? 'The treasure is yours!' : `Stop ${unlocked + 1} of 4 is ready.`}</Txt><Button title={!lessonFinished ? 'Start the addition story' : unlocked === 4 ? 'See your treasure' : `Go to stop ${unlocked + 1}`} coral icon="arrow-right" onPress={() => !lessonFinished ? go('intro') : unlocked === 4 ? go('treasure') : openStop(unlocked)} /></>, true);
  if (screen === 'question') {
    const q = homework[stop];
    return page(<>{chrome('map', `HOMEWORK · STOP ${stop + 1} / 4`)}<Txt style={[s.pill, { marginTop: 25, alignSelf: 'flex-start' }]}>{q.name.toUpperCase()}</Txt><Txt style={[s.title, { marginTop: 12 }]}>Help Bunny count!</Txt><Txt style={s.muted}>How many apples are there altogether?</Txt><View style={s.questionPanel}><View style={s.appleRow}><Apples count={q.a} size={32} /><Txt style={s.operator}>+</Txt><Apples count={q.b} size={32} /></View><Txt style={s.equation}>{q.a} + {q.b} = ?</Txt>{feedback && <Hint a={q.a} b={q.b} />}<View style={s.choices}>{q.options.map(n => <Pressable key={n} style={s.choice} onPress={() => answer(n, q.a + q.b, finishStop)}><Txt style={s.answerText}>{n}</Txt></Pressable>)}</View></View><Button secondary title="Show me how to count" onPress={help} icon="help-circle" style={{ marginTop: 17 }} /><Txt style={s.note}>Take your time. You can try as many times as you need.</Txt></>);
  }
  if (screen === 'practice') {
    const p = tasks[practiceIndex];
    return page(<>{chrome('home', 'PRACTICE GARDEN')}<Txt style={[s.pill, { alignSelf: 'flex-start', marginTop: 20 }]}>CHALLENGE {practiceIndex + 1} OF 6</Txt><View style={[s.track, { marginTop: 17, marginBottom: 22 }]}><View style={[s.trackFill, { width: `${(practiceIndex + 1) / 6 * 100}%` }]} /></View><Txt style={s.eyebrow}>{p.kind}</Txt><Txt style={[s.title, { marginTop: 8 }]}>{p.title}</Txt><Txt style={s.muted}>{practiceIndex === 1 ? 'Drag a number into the answer spot, or tap it.' : practiceIndex === 2 ? 'Which answer matches this equation?' : practiceIndex === 5 ? 'Tap from smallest to biggest. Tap a chosen number to undo.' : 'Show Bunny what you know.'}</Txt><View style={s.practiceVisual}>{practiceIndex < 5 ? <><View style={s.appleRow}><Apples count={p.a} size={31} /><Txt style={s.operator}>+</Txt><Apples count={p.b} size={31} /></View>{practiceIndex === 1 && <Txt style={s.dropZone}>{selection || 'Drop a number here  ↑'}</Txt>}</> : <View style={s.dropZone}><Txt style={s.answerText}>{order.length ? order.join('  →  ') : 'Tap smallest first'}</Txt></View>}</View>{feedback && (practiceIndex === 5 ? <View style={s.hint}><Txt style={s.hintTitle}>Almost! Start with the smallest.</Txt><Txt style={s.smallMuted}>Look at all three numbers, then try again.</Txt></View> : <Hint a={p.a} b={p.b} />)}
      {practiceIndex === 4 ? <TextInput value={selection} onChangeText={v => setSelection(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={2} placeholder="?" placeholderTextColor={C.mutedForeground} style={s.answerInput} accessibilityLabel="Your answer" /> : practiceIndex === 5 ? <><View style={s.choices}>{p.choices.filter(v => !order.includes(v)).map(v => <Pressable key={v} style={s.choice} onPress={() => setOrder(o => [...o, v])}><Txt style={s.answerText}>{v}</Txt></Pressable>)}</View>{order.length > 0 && <Button secondary title="Undo last number" onPress={() => setOrder(o => o.slice(0, -1))} style={{ marginTop: 10 }} />}</> : practiceIndex === 1 ? <View style={s.choices}>{p.choices.map(v => <View key={v} style={selection === v ? s.selectedChoice : undefined}><DragItem label={v} onDrop={() => setSelection(v)} /></View>)}</View> : <View style={s.choices}>{p.choices.map(v => <Pressable key={v} onPress={() => setSelection(v)} style={[s.choice, selection === v && s.selectedChoice]}><Txt style={s.answerText}>{v}</Txt></Pressable>)}</View>}
      <Button coral title={practiceIndex === 5 ? 'Finish practice' : 'Check my answer'} disabled={practiceIndex === 5 ? order.length !== 3 : !selection} onPress={checkPractice} icon="arrow-right" style={{ marginTop: 22 }} /><Button secondary title="I’d like a hint" icon="help-circle" onPress={help} style={{ marginTop: 12 }} /><Txt style={s.note}>Every try helps you learn.</Txt></>, true);
  }
  if (screen === 'parent') return page(<><View style={s.topbar}><View><Txt style={s.eyebrow}>LITTLE SPROUT · FAMILY VIEW</Txt><Txt style={s.title}>Sam’s learning</Txt></View><Pressable style={s.avatar} onPress={() => go('profile')}><Txt style={s.avatarText}>S</Txt></Pressable></View><Txt style={s.muted}>A clear look at the little steps behind the big progress.</Txt><View style={[s.parentCard, { backgroundColor: '#dcece1' }]}><Txt style={s.eyebrow}>SAMPLE FAMILY INSIGHT</Txt><Txt style={s.sectionTitle}>Addition is taking root.</Txt><Txt style={s.body}>Example: Counting on with larger sums is a good next step.</Txt></View>{sectionTitle('This session’s activity')}<View style={s.parentCard}>{[['Lesson · Putting groups together', `${lessonFinished ? 5 : chapter} of 5 scenes completed`, 'play'], ['Homework · Apple trail', `${unlocked} of 4 stops completed`, 'compass'], ['Practice · Six question styles', `${practiceIndex} of 6 tasks completed`, 'star']].map(([title, sub, icon]) => <View key={title} style={s.activity}><Icon name={icon as IconName} /><View style={{ flex: 1 }}><Txt style={s.rowTitle}>{title}</Txt><Txt style={s.smallMuted}>{sub}</Txt></View></View>)}</View>{sectionTitle('How Sam learned')}<View style={s.metricRow}><Metric value={record.independent} label="On own" /><Metric value={record.hints} label="Hints used" tint="#f9e5d6" /><Metric value={record.attempts} label="Attempts" tint={C.lilac} /></View><View style={s.parentCard}><Txt style={s.eyebrow}>SAMPLE CONCEPT INSIGHTS</Txt><InsightRow title="Strong · Counting objects" detail="Example observation: Sam counts visible apples confidently." color="#76b394" /><InsightRow title="Growing · Sums up to 10" detail="Example next step: practice combining larger groups." color="#e4b654" /></View><Button title="Explore learning insights" icon="arrow-right" onPress={() => go('insights')} style={{ marginTop: 16 }} /><Txt style={s.note}>Concept insights are labeled examples. Activity and interaction counts above are from this session only.</Txt></>, true, true);
  return page(<>{chrome('parent', 'LEARNING INSIGHTS')}<Txt style={[s.pill, { alignSelf: 'flex-start', marginTop: 27 }]}>A CLOSER LOOK AT SAM’S LEARNING</Txt><Txt style={[s.title, { marginTop: 14 }]}>More than a score.</Txt><Txt style={s.muted}>A sample of what a future family view could explain.</Txt><View style={s.parentCard}><Txt style={s.sectionTitle}>Sample concept insights</Txt><InsightRow title="Strong · Counting objects" detail="Example: can count and combine two small visible groups." color="#76b394" /><InsightRow title="Needs practice · Addition up to 10" detail="Example: benefits from seeing each object in 4 + 3 and 5 + 3." color="#e4b654" /><InsightRow title="Keep an eye on · Story problems" detail="Example: may need help turning a story into an equation." color={C.coral} /></View><View style={s.parentCard}><Txt style={s.sectionTitle}>How Sam solved · this session</Txt><View style={s.metricRow}><Metric value={record.independent} label="Independent" /><Metric value={record.hints} label="Hints" tint="#f9e5d6" /><Metric value={record.explanations} label="Explanations" tint={C.lilac} /></View><Txt style={[s.muted, { fontSize: 12 }]}>Across {record.attempts} attempts. Hints are part of learning, not a penalty.</Txt></View><View style={[s.parentCard, { backgroundColor: '#e2eee5' }]}><Txt style={s.sectionTitle}>Try together next · sample idea</Txt><Txt style={s.muted}>Put 4 small objects next to 3 more. Count them together and ask, “How many altogether?”</Txt></View><Button title="Back to dashboard" onPress={() => go('parent')} /><Txt style={s.note}>Concept insights are illustrative samples, not real analytics. Counts reset when the prototype reloads.</Txt></>, true, true);
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background }, page: { paddingHorizontal: 23, flexGrow: 1 }, body: { fontFamily: 'DM Sans', color: C.foreground, fontSize: 15, lineHeight: 22 }, muted: { fontFamily: 'DM Sans', color: C.mutedForeground, fontSize: 15, lineHeight: 23, marginTop: 9 }, smallMuted: { fontFamily: 'DM Sans', color: C.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 3 },
  eyebrow: { fontFamily: 'DM Sans Bold', color: C.primary, fontSize: 10, letterSpacing: 1.5 }, brand: { fontFamily: 'Fredoka SemiBold', color: C.primary, fontSize: 22 }, hero: { fontFamily: 'Fredoka SemiBold', color: C.foreground, fontSize: 40, lineHeight: 43, marginTop: 13, letterSpacing: -1 }, title: { fontFamily: 'Fredoka SemiBold', color: C.foreground, fontSize: 34, lineHeight: 38 }, center: { textAlign: 'center' },
  topbar: { height: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 42, height: 42, borderRadius: 15, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }, avatar: { width: 44, height: 44, borderRadius: 24, backgroundColor: C.butter, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.paper }, avatarText: { fontFamily: 'Fredoka SemiBold', fontSize: 18, color: C.primary },
  button: { minHeight: 55, borderRadius: 19, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, paddingHorizontal: 15 }, buttonText: { fontFamily: 'DM Sans Bold', color: C.paper, fontSize: 15 }, coralButton: { backgroundColor: C.coral }, secondaryButton: { backgroundColor: C.paper, borderWidth: 1.5, borderColor: '#cbdbd1' },
  pill: { fontFamily: 'DM Sans Bold', fontSize: 10, color: C.primary, backgroundColor: '#e7f2e9', borderRadius: 30, overflow: 'hidden', paddingHorizontal: 13, paddingVertical: 9, letterSpacing: .3 }, feature: { minHeight: 282, borderRadius: 30, marginTop: 25, padding: 21, overflow: 'hidden', alignItems: 'flex-start' }, featureTitle: { fontFamily: 'Fredoka SemiBold', fontSize: 30, lineHeight: 31, color: C.foreground, marginTop: 13, zIndex: 1 }, featureDetail: { fontFamily: 'DM Sans', fontSize: 12, lineHeight: 18, color: C.foreground, marginTop: 7, width: '53%', zIndex: 1 }, featureBunny: { position: 'absolute', width: '57%', height: '84%', right: -11, bottom: -8 }, featureCta: { marginTop: 'auto', borderRadius: 30, backgroundColor: C.paper, paddingHorizontal: 16, paddingVertical: 11, zIndex: 1 }, featureCtaText: { fontFamily: 'DM Sans Bold', color: C.primary, fontSize: 12 },
  sectionTitle: { fontFamily: 'Fredoka SemiBold', color: C.foreground, fontSize: 23, marginTop: 27, marginBottom: 13 }, tileRow: { flexDirection: 'row', gap: 12 }, tile: { flex: 1, borderRadius: 24, minHeight: 151, padding: 17, justifyContent: 'space-between' }, tileTitle: { fontFamily: 'Fredoka SemiBold', fontSize: 20, lineHeight: 21, color: C.foreground }, curriculum: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: C.paper, padding: 16, borderRadius: 21, borderWidth: 1, borderColor: C.border, marginBottom: 9 }, rowTitle: { fontFamily: 'DM Sans Bold', color: C.foreground, fontSize: 14 },
  nav: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderColor: C.border, backgroundColor: C.paper, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around', paddingTop: 13 }, navItem: { alignItems: 'center', gap: 4, minWidth: 55 }, navLabel: { fontFamily: 'DM Sans Bold', fontSize: 9, color: C.mutedForeground },
  lesson: { flex: 1, paddingHorizontal: 21 }, lessonTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, progressDots: { flexDirection: 'row', gap: 5 }, progressDot: { width: 21, height: 6, borderRadius: 5, backgroundColor: '#bdd3c5' }, countBadge: { fontFamily: 'DM Sans Bold', color: C.foreground, fontSize: 11, backgroundColor: C.paper, padding: 9, borderRadius: 20 }, lessonHeading: { alignItems: 'center', paddingTop: 15 }, lessonTitle: { fontFamily: 'Fredoka SemiBold', color: C.foreground, fontSize: 35, lineHeight: 38, textAlign: 'center', marginTop: 7 }, lessonCaption: { fontFamily: 'DM Sans', color: C.foreground, fontSize: 13, textAlign: 'center', marginTop: 7, lineHeight: 18 }, lessonArt: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', gap: 8 }, orchard: { width: '100%', height: '80%' }, lessonBunny: { width: '53%', height: '51%' }, bubble: { fontFamily: 'Fredoka SemiBold', color: C.primary, fontSize: 22, textAlign: 'center', backgroundColor: C.paper, paddingHorizontal: 17, paddingVertical: 10, borderRadius: 20, overflow: 'hidden' }, appleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }, apples: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', maxWidth: 140 }, operator: { fontFamily: 'Fredoka SemiBold', color: C.primary, fontSize: 30 }, equation: { fontFamily: 'Fredoka SemiBold', fontSize: 38, color: C.primary, textAlign: 'center', marginVertical: 8 }, lessonBottom: { gap: 10, alignItems: 'center' }, controls: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 10 }, playButton: { width: 55, height: 55, borderRadius: 17, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' }, swipeTip: { fontFamily: 'DM Sans Bold', fontSize: 11, color: C.primary }, track: { height: 5, borderRadius: 8, backgroundColor: '#c7dacb', width: '100%', overflow: 'hidden' }, trackFill: { height: '100%', backgroundColor: C.primary, borderRadius: 8 },
  choices: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 10, minHeight: 60 }, choice: { width: 70, height: 65, borderWidth: 2, borderColor: '#cbdccc', borderRadius: 19, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' }, answerText: { fontFamily: 'Fredoka SemiBold', color: C.primary, fontSize: 30 }, selectedChoice: { borderColor: C.primary, backgroundColor: '#d9efe2', borderRadius: 19 }, dragItem: { width: 70, height: 65, borderRadius: 19, borderWidth: 2, borderColor: '#cbdccc', backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' }, hint: { backgroundColor: C.paper, padding: 11, borderWidth: 2, borderStyle: 'dashed', borderColor: '#e7b896', borderRadius: 20, alignItems: 'center', width: '100%' }, hintTitle: { fontFamily: 'Fredoka SemiBold', color: '#a45348', fontSize: 16 }, questionPanel: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, padding: 19, borderRadius: 27, marginTop: 24, alignItems: 'center', gap: 9 },
  celebrateArt: { backgroundColor: '#dceee1', borderRadius: 36, height: 280, alignItems: 'center', justifyContent: 'center', marginVertical: 23, overflow: 'hidden' }, celebrateBunny: { width: '69%', height: '94%' }, sticker: { position: 'absolute', bottom: 18, right: 23, padding: 13, borderRadius: 40, backgroundColor: C.butter }, metricRow: { flexDirection: 'row', gap: 9, marginVertical: 20 }, metric: { flex: 1, borderRadius: 17, backgroundColor: '#e4f0e7', padding: 12, minHeight: 69 }, metricNumber: { fontFamily: 'Fredoka SemiBold', color: C.foreground, fontSize: 23 }, metricLabel: { fontFamily: 'DM Sans Bold', color: '#62756a', fontSize: 10 }, note: { fontFamily: 'DM Sans', fontSize: 10, color: '#89948b', lineHeight: 15, textAlign: 'center', marginVertical: 17 },
  map: { height: 425, marginTop: 18, backgroundColor: '#dfefdb', borderRadius: 31, borderWidth: 5, borderColor: '#f4f6e8', overflow: 'hidden' }, mapPath: { position: 'absolute', width: '67%', height: '85%', borderWidth: 4, borderColor: '#b2d0af', borderRadius: 200, left: '16%', top: '8%', transform: [{ rotate: '-20deg' }] }, mapStop: { position: 'absolute', width: 76, height: 76, borderRadius: 23, alignItems: 'center', justifyContent: 'center', elevation: 2 }, mapLabel: { fontFamily: 'Fredoka SemiBold', color: C.primary, fontSize: 11 }, practiceVisual: { minHeight: 150, justifyContent: 'center', alignItems: 'center', gap: 10 }, dropZone: { fontFamily: 'Fredoka SemiBold', color: C.primary, fontSize: 22, textAlign: 'center', backgroundColor: '#eef7ed', borderWidth: 2, borderStyle: 'dashed', borderColor: '#bfd6c4', borderRadius: 16, minWidth: '80%', padding: 12, overflow: 'hidden' }, answerInput: { height: 64, borderWidth: 2, borderColor: '#c5d7cb', borderRadius: 19, backgroundColor: C.paper, textAlign: 'center', fontFamily: 'Fredoka SemiBold', color: C.primary, fontSize: 29 },
  parentCard: { borderRadius: 23, backgroundColor: C.paper, borderColor: C.border, borderWidth: 1, padding: 18, marginTop: 14 }, activity: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border }, insightRow: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }, dot: { width: 11, height: 11, borderRadius: 6, marginTop: 4 },
});