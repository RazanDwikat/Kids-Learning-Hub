import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View, Image, useWindowDimensions } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { getGetLearningStateQueryKey, getLearningState, useGetLearningState, useUpdateLearningSceneProgress, useSubmitLearningSceneAttempt, useAdvanceLearningScene, useRecordLearningSceneExplanation } from '@workspace/api-client-react';
import type { LearningState } from '@workspace/api-client-react';
import { PENDING_KEY, useLearningSession } from '@/hooks/useLearningSession';
import { isNetworkError, learningRequestError, withRequestTimeout } from '@/hooks/learningNetwork';
import { useScreenHistory } from '@/hooks/useScreenHistory';
import colors from '@/constants/colors';
import { StoryScene } from '@/components/StoryScene';
import { GardenPages } from '@/components/garden/GardenPages';
import { ActivityPages } from '@/components/garden/ActivityPages';

const C = colors.light;
const bunny = require('../../assets/images/sprout-bunny.png');
type Screen = 'home' | 'profile' | 'math' | 'grade' | 'intro' | 'lesson' | 'complete' | 'map' | 'practice' | 'parent';
const historyScreens: readonly Screen[] = ['home', 'profile', 'math', 'grade', 'intro', 'lesson', 'complete', 'map', 'practice', 'parent'];
type IconName = React.ComponentProps<typeof Feather>['name'];
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
function Hint({ a, b, title = "Almost! Let's count together." }: { a: number; b: number; title?: string }) {
  return <View style={s.hint}><Txt style={s.hintTitle}>{title}</Txt><Txt style={s.smallMuted}>Touch each apple as you count. You've got this!</Txt><Apples count={a + b} size={26} /></View>;
}
function DragItem({ label, apple = false, onDrop }: { label?: string; apple?: boolean; onDrop: () => void }) {
  const offset = useRef(new Animated.ValueXY()).current;
  const moved = useRef(false);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, gesture) => { if (Math.abs(gesture.dx) + Math.abs(gesture.dy) > 8) moved.current = true; offset.setValue({ x: gesture.dx, y: gesture.dy }); },
    onPanResponderRelease: (_, gesture) => {
      // The basket is to the left. A page scroll or a drag in another direction
      // is not an answer; a stationary tap remains an accessible alternative.
      if ((!moved.current && Math.abs(gesture.dx) < 8 && Math.abs(gesture.dy) < 8) ||
          (gesture.dx < -50 && Math.abs(gesture.dy) < 55)) onDropRef.current();
      moved.current = false;
      Animated.spring(offset, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => {
      moved.current = false;
      Animated.spring(offset, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
    },
  })).current;
  return <Animated.View {...responder.panHandlers} testID="lesson-drag-apple" accessibilityRole="button" accessibilityLabel="Move apple to the left group" style={[s.dragItem, Platform.OS === 'web' && { touchAction: 'none' } as any, { transform: offset.getTranslateTransform() }]}>
    {apple ? <MaterialCommunityIcons name="food-apple" size={37} color={C.coral} /> : <Txt style={s.answerText}>{label}</Txt>}
  </Animated.View>;
}
function Metric({ value, label, tint }: { value: string | number; label: string; tint?: string }) {
  return <View style={[s.metric, tint ? { backgroundColor: tint } : null]}><Txt style={s.metricNumber}>{value}</Txt><Txt style={s.metricLabel}>{label}</Txt></View>;
}
type PendingAttempt = { sceneId: string; answer: number; requestId: string };
const requestId = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.floor(Math.random() * 16);
  return (c === 'x' ? r : (r & 3) | 8).toString(16);
});

export default function LittleSprout() {
  const windowSize = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomInset = Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;
  const session = useLearningSession();
  const [retryingRead, setRetryingRead] = useState(false);
  const query = useGetLearningState({ query: {
    queryKey: getGetLearningStateQueryKey(),
    queryFn: ({ signal }) => withRequestTimeout(requestSignal => getLearningState({ signal: requestSignal }), signal),
    enabled: session.ready,
    retry: (failures, error) => failures < 2 && isNetworkError(error),
    staleTime: 0,
    refetchOnWindowFocus: false,
  } });
  const cache = useQueryClient();
  const progressMutation = useUpdateLearningSceneProgress();
  const attemptMutation = useSubmitLearningSceneAttempt();
  const advanceMutation = useAdvanceLearningScene();
  const explanationMutation = useRecordLearningSceneExplanation();
  const [screen, setScreen] = useState<Screen>('home');
  const [chapter, setChapter] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; showApples: boolean } | null>(null);
  const [pending, setPending] = useState<PendingAttempt | null>(null);
  const [pendingLoaded, setPendingLoaded] = useState(false);
  const busy = useRef(false);
  const pager = useRef<ScrollView>(null);
  const pageScroll = useRef<ScrollView>(null);
  const pageHeight = useRef(windowSize.height);
  const [viewportHeight, setViewportHeight] = useState(windowSize.height);
  const settling = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoring = useRef(false);
  const chapterRef = useRef(0);
  const position = useRef(0);
  const sceneRef = useRef<string | null>(null);
  const movedRef = useRef(0);
  const [saving, setSaving] = useState(false);
  const state = query.data;
  const scenes = state?.lesson.scenes ?? [];
  const scene = scenes[chapter];
  const sceneProgress = state?.progress.scenes.find(p => p.sceneId === scene?.id);
  const moved = sceneProgress?.movedCount ?? 0;
  const solved = !!sceneProgress?.solved;
  const finished = !!state?.progress.lessonCompleted;
  const pendingNeedsRetry = !!pending && pendingLoaded;
  const updateState = (next: LearningState) => cache.setQueryData(getGetLearningStateQueryKey(), next);
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : 'Could not save your progress. Please retry.');
  const guarded = async (action: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true; setSaving(true); setError(null);
    try { await action(); } catch (e) { fail(e); }
    finally { busy.current = false; setSaving(false); }
  };
  // Refuse to create a fresh attempt while a previous answer has an uncertain outcome.
  const loadPending = () => {
    setError(null);
    AsyncStorage.getItem(PENDING_KEY).then(raw => {
      if (raw) setPending(JSON.parse(raw) as PendingAttempt);
      setPendingLoaded(true);
    }).catch(fail);
  };
  useEffect(() => { if (session.ready) loadPending(); }, [session.ready]);
  const [muted, setMuted] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  // Playback position is separate from saved furthest progress (the API only accepts monotonic increases).
  const resumeRef = useRef(0);
  const onScenePlayback = (pct: number) => { position.current = Math.max(position.current, Math.round(pct)); setVideoProgress(pct); };
  const onSceneEnded = () => { position.current = 100; setVideoProgress(100); setPlaying(false); };
  const resetMedia = (saved: number) => { resumeRef.current = saved >= 100 ? 0 : saved; setBlocked(false); setMediaError(null); setReplayKey(0); };
  // A single serialized write path prevents a late timer response from rewinding a newer scene.
  const save = async () => {
    const id = sceneRef.current;
    if (!id) return;
    const result = await progressMutation.mutateAsync({ sceneId: id, data: { positionPercent: Math.round(position.current), ...(scenes.find(s => s.id === id)?.type === 'drag' ? { movedCount: movedRef.current } : {}) } });
    updateState(result.state);
  };
  useEffect(() => {
    if (screen !== 'lesson' || !scene || !session.ready) return;
    const interval = setInterval(() => {
      const saved = cache.getQueryData<LearningState>(getGetLearningStateQueryKey())?.progress.scenes.find(p => p.sceneId === scene.id);
      if (!busy.current && !error && (Math.round(position.current) !== saved?.positionPercent || (scene.type === 'drag' && movedRef.current !== saved?.movedCount))) void guarded(save);
    }, 2500);
    const sub = AppState.addEventListener('change', next => {
      if (next !== 'active') setPlaying(false);
      if (next !== 'active' && !busy.current && !error) void guarded(save);
    });
    return () => { clearInterval(interval); sub.remove(); };
  }, [screen, scene?.id, session.ready, state, error]);
  const enterStory = () => {
    if (!state) return;
    if (finished) { setScreen('complete'); return; }
    const index = Math.min(state.progress.currentSceneIndex, scenes.length - 1);
    const next = scenes[index];
    chapterRef.current = index; setChapter(index); sceneRef.current = next.id;
    const progress = state.progress.scenes.find(p => p.sceneId === next.id);
    position.current = progress?.positionPercent ?? 0;
    movedRef.current = progress?.movedCount ?? 0;
    resetMedia(position.current); setVideoProgress(resumeRef.current); setFeedback(null); setPlaying(true); setScreen('lesson');
  };
  const go = async (destination: Screen): Promise<boolean> => {
    if (busy.current) return false;
    if (screen === 'lesson' && destination !== 'lesson') {
      setPlaying(false);
      let navigated = false;
      await guarded(async () => { await save(); setPlaying(false); setFeedback(null); setScreen(destination); navigated = true; });
      return navigated;
    } else { setFeedback(null); setScreen(destination); return true; }
  };
  useScreenHistory<Screen>(screen, 'home', historyScreens, go);
  const snapTo = (index: number, animated = true) => {
    if (!pageHeight.current) return;
    restoring.current = true;
    pager.current?.scrollTo({ y: pageHeight.current * index, animated });
    // Ignore the scroll events generated by the corrective scroll.
    setTimeout(() => { restoring.current = false; }, animated ? 420 : 80);
  };
  useEffect(() => {
    if (screen !== 'lesson') return;
    pageHeight.current = windowSize.height;
    setViewportHeight(windowSize.height);
    const frame = requestAnimationFrame(() => snapTo(chapterRef.current, false));
    return () => cancelAnimationFrame(frame);
  }, [screen, windowSize.height]);
  const changeChapter = (next: number) => {
    if (busy.current || !scene || !state || next === chapterRef.current) return;
    const from = chapterRef.current;
    const canAdvance = !pendingNeedsRetry && (from < 2 || solved || (from === 2 && moved === scene.operands.b));
    if (next > from && !canAdvance) { snapTo(from); return; }
    setPlaying(false);
    void guarded(async () => {
      try {
        await save();
        if (next > from && !state.progress.completedSceneIds.includes(scene.id)) {
          const result = await advanceMutation.mutateAsync({ sceneId: scene.id });
          updateState(result.state);
          if (result.state.progress.lessonCompleted) { setScreen('complete'); return; }
        }
        if (next >= scenes.length) { setScreen('complete'); return; }
        const target = scenes[next];
        const saved = (cache.getQueryData<LearningState>(getGetLearningStateQueryKey()) ?? state).progress.scenes.find(p => p.sceneId === target.id);
        sceneRef.current = target.id; position.current = saved?.positionPercent ?? 0;
        movedRef.current = saved?.movedCount ?? 0;
        resetMedia(position.current); chapterRef.current = next; setChapter(next);
        setVideoProgress(resumeRef.current); setFeedback(null);
        snapTo(next, false);
        setPlaying(true);
      } catch (e) {
        snapTo(from);
        throw e;
      }
    });
  };
  const settlePage = (offset: number) => {
    if (!pageHeight.current || restoring.current || screen !== 'lesson') return;
    const from = chapterRef.current;
    const next = Math.max(0, Math.min(scenes.length, Math.round(offset / pageHeight.current)));
    if (next === from) return;
    if (busy.current || Math.abs(next - from) > 1) { snapTo(from); return; }
    changeChapter(next);
  };
  useEffect(() => () => { if (settling.current) clearTimeout(settling.current); }, []);
  const canNext = !pendingNeedsRetry && (chapter < 2 || solved || (chapter === 2 && moved === scene?.operands.b));
  // Do not put locked scenes into the scrollable content at all. A fast touch
  // fling can travel multiple pages before a settle callback gets to reject it.
  const lastVisiblePage = Math.min(scenes.length, chapter + (canNext ? 1 : 0));
  const moveApple = () => void guarded(async () => {
    if (!scene || movedRef.current >= 2) return;
    movedRef.current += 1;
    try { await save(); } catch (e) { movedRef.current -= 1; throw e; }
  });
  const sendAttempt = async (attempt: PendingAttempt) => {
    const result = await attemptMutation.mutateAsync({ sceneId: attempt.sceneId, data: { answer: attempt.answer, requestId: attempt.requestId } });
    updateState(result.state);
    if (screen === 'lesson' && scene?.id === attempt.sceneId) setFeedback({ text: result.feedback, showApples: !result.correct });
    await AsyncStorage.removeItem(PENDING_KEY);
    setPending(null);
  };
  const retryPending = () => void guarded(async () => {
    if (pending) await sendAttempt(pending);
  });
  const submit = (answer: number) => void guarded(async () => {
    if (!scene || !pendingLoaded) return;
    let attempt = pending;
    if (attempt && (attempt.sceneId !== scene.id || attempt.answer !== answer)) {
      setError('Your previous answer needs to be retried before trying another.');
      return;
    }
    if (!attempt) {
      attempt = { sceneId: scene.id, answer, requestId: requestId() };
      await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(attempt));
      setPending(attempt);
    }
    await sendAttempt(attempt);
  });
  const help = () => void guarded(async () => {
    if (!scene) return;
    const result = await explanationMutation.mutateAsync({ sceneId: scene.id });
    updateState(result.state);
    setFeedback({ text: "Let's count together.", showApples: true });
  });
  const chrome = (back: Screen, label: string) => <View style={s.topbar}><Pressable accessibilityLabel="Go back" onPress={() => go(back)} style={s.back}><Icon name="arrow-left" /></Pressable><Txt style={s.eyebrow}>{label}</Txt><View style={{ width: 42 }} /></View>;
  const nav = <View style={[s.nav, { paddingBottom: bottomInset, height: 65 + bottomInset }]}>{([['home', 'home', 'Home'], ['math', 'book-open', 'Learn'], ['map', 'compass', 'Homework'], ['practice', 'star', 'Practice'], ['parent', 'user', 'Grown-up']] as [Screen, IconName, string][]).map(([dest, icon, label]) => <Pressable key={dest} onPress={() => go(dest)} style={s.navItem}><Icon name={icon} size={20} color={screen === dest ? C.primary : C.mutedForeground} /><Txt style={[s.navLabel, screen === dest && { color: C.primary }]}>{label}</Txt></Pressable>)}</View>;
  const message = (text: string, retry?: () => void, retrying = false) => <View style={[s.hint, { marginVertical: 12 }]}><Txt style={s.hintTitle}>{text}</Txt>{retry && <Button secondary title={retrying ? 'Retrying…' : 'Retry'} disabled={retrying} onPress={retry} />}</View>;
  const page = (children: React.ReactNode, withNav = false) => <View style={s.root}><ScrollView ref={pageScroll} contentContainerStyle={[s.page, { paddingTop: topInset + 15, paddingBottom: (withNav ? 85 : 30) + bottomInset }]}>{children}{pendingNeedsRetry ? message(error ?? 'A saved answer needs to be confirmed before continuing.', retryPending) : error && message(error, () => { setError(null); void query.refetch(); })}{saving && <Txt style={s.note}>Saving your learning…</Txt>}</ScrollView>{withNav && nav}{notice && <Pressable style={[s.hint, { position: 'absolute', bottom: bottomInset + 88, left: 25, right: 25 }]} onPress={() => setNotice(null)}><Txt style={s.hintTitle}>{notice} · Tap to close</Txt></Pressable>}</View>;
   if (session.error || session.loading && !session.ready) return page(message(session.loading ? 'Connecting to your garden…' : session.error!, () => void session.retry(), session.loading));
  if (retryingRead) return page(message('Connecting to your garden…', () => {}, true));
  if (!session.ready || query.isPending) return page(message('Loading your garden…'));
  if (!pendingLoaded) return page(message(error ?? 'Loading your garden…', error ? loadPending : undefined));
   if (query.error || !state) return page(message(
     query.isFetching ? 'Connecting to your garden…' : learningRequestError(query.error, 'Could not load your garden. Please retry.'),
     () => {
       setRetryingRead(true);
       void query.refetch().finally(() => setRetryingRead(false));
     },
     query.isFetching,
   ));
  if (screen === 'home' || screen === 'profile' || screen === 'math' || screen === 'grade' || screen === 'parent') return page(<GardenPages key={screen} screen={screen} state={state} go={go} continueLesson={() => state.progress.currentSceneIndex || finished ? enterStory() : go('intro')} />, true);
  if (screen === 'map' || screen === 'practice') return page(<ActivityPages key={screen} kind={screen === 'map' ? 'homework' : 'practice'} lessonComplete={finished} onLesson={() => go('intro')} onHome={() => go('home')} onParent={() => go('parent')} onShowMap={() => pageScroll.current?.scrollTo({ y: 0, animated: false })} />, true);
  if (screen === 'lesson' && scene) return <View style={{ flex: 1 }} onLayout={e => {
    const height = e.nativeEvent.layout.height;
    if (height && height !== pageHeight.current) {
      pageHeight.current = height; setViewportHeight(height);
      // Resume directly at the saved page, not at the first frame of page one.
      setTimeout(() => snapTo(chapterRef.current, false), 0);
    }
  }}>
    <ScrollView ref={pager} testID="lesson-pages" style={[{ flex: 1 }, Platform.OS === 'web' && { scrollSnapType: 'y mandatory', overscrollBehaviorY: 'contain', userSelect: 'none', WebkitUserSelect: 'none' } as any]}
      pagingEnabled showsVerticalScrollIndicator={false} bounces={false} scrollEventThrottle={32}
      onScroll={e => {
        if (restoring.current) return;
        // Silence narration as soon as its page starts moving out of view,
        // rather than waiting for the snap/save to finish.
        if (Math.abs(e.nativeEvent.contentOffset.y - chapterRef.current * pageHeight.current) > 2 && playing) setPlaying(false);
        // Web wheel/trackpad scrolling has no reliable momentum-end event.
        // Native settles using the drag/momentum end callbacks below instead.
        if (Platform.OS === 'web') {
          const offset = e.nativeEvent.contentOffset.y;
          if (settling.current) clearTimeout(settling.current);
          settling.current = setTimeout(() => settlePage(offset), 190);
        }
      }}
      onMomentumScrollEnd={e => {
        if (settling.current) clearTimeout(settling.current);
        settlePage(e.nativeEvent.contentOffset.y);
      }}
      onScrollEndDrag={e => {
        if (settling.current) clearTimeout(settling.current);
        const offset = e.nativeEvent.contentOffset.y;
        settling.current = setTimeout(() => settlePage(offset), 300);
      }}
      onContentSizeChange={() => { if (pageHeight.current && !restoring.current) snapTo(chapterRef.current, false); }}
    >
    {scenes.map((item, i) => {
      if (i > lastVisiblePage) return null;
      const active = i === chapter;
      const video = item.type === 'video' && i < 2;
      const itemProgress = state.progress.scenes.find(p => p.sceneId === item.id);
      const itemMoved = active ? moved : (itemProgress?.movedCount ?? 0);
      return <View key={item.id} testID={`lesson-page-${i + 1}`} style={[s.lesson, { height: viewportHeight || undefined, flexGrow: 0, flexShrink: 0, backgroundColor: item.color, paddingTop: topInset + 10, paddingBottom: bottomInset + 13 }, Platform.OS === 'web' && { scrollSnapAlign: 'start', scrollSnapStop: 'always' } as any]}>
     <View style={s.lessonTop}><Pressable style={s.back} onPress={() => go('intro')}><Icon name="x" /></Pressable><View style={s.progressDots}>{scenes.map((_, dot) => <View key={dot} style={[s.progressDot, dot <= i && { backgroundColor: C.primary }]} />)}</View><Txt style={s.countBadge}>{i + 1} / {scenes.length}</Txt></View>
     <View style={s.lessonHeading}><Txt style={s.eyebrow}>{video ? 'WATCH & LEARN · ADDITION' : 'YOUR TURN · ADDITION'}</Txt><Txt style={s.lessonTitle}>{item.title}</Txt>{!video && <Txt style={s.lessonCaption}>{item.caption}</Txt>}</View>
     <View style={s.lessonArt}>
       {video && active && <StoryScene kind={i === 0 ? 'story' : 'groups'} key={item.id} playing={playing} muted={muted} resumePercent={resumeRef.current} replayKey={replayKey} retryKey={retryKey} blocked={blocked}
        onProgress={onScenePlayback} onEnded={onSceneEnded}
        onBlocked={() => { setPlaying(false); setBlocked(true); }}
        onError={() => { setPlaying(false); setMediaError('The story sound could not play. Check your connection and retry.'); }}
        onRetry={() => { setBlocked(false); setPlaying(true); }} />}
       {video && !active && <><Image source={bunny} resizeMode="contain" style={s.lessonBunny} /><View style={s.appleRow}><Apples count={item.operands.a} /><Txt style={s.operator}>+</Txt><Apples count={item.operands.b} /></View><Txt style={s.lessonCaption}>{item.caption}</Txt></>}
       {video && active && mediaError && message(mediaError, () => { setMediaError(null); setBlocked(false); setRetryKey(k => k + 1); setPlaying(true); })}
       {item.type === 'drag' && <><Image source={bunny} resizeMode="contain" style={s.lessonBunny} /><View style={s.appleRow}><Apples count={item.operands.a + itemMoved} size={32} /><Txt style={s.operator}>←</Txt><View style={s.apples}>{Array.from({ length: Math.max(0, item.operands.b - itemMoved) }, (_, appleIndex) => active ? <DragItem key={appleIndex} apple onDrop={moveApple} /> : <MaterialCommunityIcons key={appleIndex} name="food-apple" size={37} color={C.coral} />)}</View></View><Txt style={s.lessonCaption}>{itemMoved === item.operands.b ? `Wonderful! ${item.operands.a} + ${item.operands.b} = ${item.operands.a + item.operands.b}` : 'Drag an apple left, or tap it!'}</Txt></>}
       {item.type === 'choice' && <>{i === 3 ? <View style={s.appleRow}><Apples count={item.operands.a} /><Txt style={s.operator}>+</Txt><Apples count={item.operands.b} /></View> : <Image source={bunny} resizeMode="contain" style={s.lessonBunny} />}<Txt style={s.equation}>{item.operands.a} + {item.operands.b} = ?</Txt>{active && feedback && (feedback.showApples ? <Hint a={item.operands.a} b={item.operands.b} title={feedback.text} /> : <View style={s.hint}><Txt style={s.hintTitle}>{feedback.text}</Txt></View>)}</>}
    </View>
    <View style={s.lessonBottom}>
       {active && item.type === 'choice' && !solved && <View style={s.choices}>{item.options.map(n => <Pressable testID={`lesson-answer-${n}`} disabled={saving || !!pending && pending.answer !== n} style={s.choice} key={n} onPress={() => submit(n)}><Txt style={s.answerText}>{n}</Txt></Pressable>)}</View>}
       {active && item.type === 'choice' && !solved && <Button secondary title="Show me how to count" onPress={help} disabled={saving || !!pending} icon="help-circle" />}
       {active && solved && <Txt style={s.pill}>✓  Yes! You counted them all.</Txt>}
       {active && (pendingNeedsRetry ? message(error ?? 'A saved answer needs to be confirmed before continuing.', retryPending) : error && message(error, () => void guarded(save)))}
       {active && saving && <Txt style={s.swipeTip}>Saving your learning…</Txt>}
       {active ? <><View style={s.controls}>{video && <><Pressable testID="button-play-pause" accessibilityRole="button" accessibilityLabel={playing ? 'Pause story' : 'Play story'} onPress={() => { setBlocked(false); if (playing) { setPlaying(false); if (!busy.current) void guarded(save); } else setPlaying(true); }} style={s.playButton}><Icon name={playing ? 'pause' : 'play'} /></Pressable><Pressable testID="button-mute" accessibilityRole="button" accessibilityLabel={muted ? 'Turn sound on' : 'Mute sound'} onPress={() => setMuted(m => !m)} style={s.playButton}><Icon name={muted ? 'volume-x' : 'volume-2'} /></Pressable><Pressable testID="button-replay" accessibilityRole="button" accessibilityLabel="Replay story from the start" onPress={() => { setBlocked(false); setReplayKey(k => k + 1); setVideoProgress(0); setPlaying(true); }} style={s.playButton}><Icon name="rotate-ccw" /></Pressable></>}<Button coral title={i === scenes.length - 1 ? 'Finish lesson' : 'Next scene'} onPress={() => changeChapter(i + 1)} disabled={!canNext || saving} icon="arrow-right" style={{ flex: 1 }} /></View>
       <Txt style={s.swipeTip}>{canNext ? (video && videoProgress >= 100 ? 'Story finished · swipe up, scroll, or tap Next' : 'Swipe up, scroll, or tap Next · 5 scenes') : 'Try the activity to continue'}</Txt>
       <View testID="story-progress" accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(video ? videoProgress : 100) }} style={s.track}><View style={[s.trackFill, { width: `${video ? videoProgress : 100}%` }]} /></View>{video && <Txt style={[s.swipeTip, { fontSize: 9, marginTop: 4 }]}>Narration uses a synthetic voice.</Txt>}</> : <Txt style={s.swipeTip}>{itemProgress?.solved || state.progress.completedSceneIds.includes(item.id) ? 'Scene completed' : 'Scroll to explore this scene'}</Txt>}
    </View>
   </View>;
    })}
    {lastVisiblePage === scenes.length && <View testID="lesson-finish-page" style={[s.lesson, { height: viewportHeight || undefined, flexGrow: 0, flexShrink: 0, backgroundColor: scenes[scenes.length - 1].color, paddingTop: topInset + 10, paddingBottom: bottomInset + 13 }, Platform.OS === 'web' && { scrollSnapAlign: 'start', scrollSnapStop: 'always' } as any]}>
      <View style={s.lessonTop}><View style={{ width: 42 }} /><View style={s.progressDots}>{scenes.map((_, dot) => <View key={dot} style={[s.progressDot, { backgroundColor: C.primary }]} />)}</View><Txt style={s.countBadge}>{scenes.length} / {scenes.length}</Txt></View>
      <View style={[s.lessonArt, { gap: 20 }]}><Image source={bunny} resizeMode="contain" style={s.lessonBunny} /><Txt style={[s.lessonTitle, s.center]}>You helped Bunny!</Txt><Apples count={scenes[scenes.length - 1].operands.a + scenes[scenes.length - 1].operands.b} /><Txt style={s.lessonCaption}>Finishing your story…</Txt></View>
    </View>}
    </ScrollView>
  </View>;
  if (screen === 'intro') return page(<>{chrome('math', 'ADDITION · LESSON')}<Txt style={[s.pill, { marginTop: 28, alignSelf: 'flex-start' }]}>5 LITTLE SCENES</Txt><Txt style={s.hero}>Two apples.{'\n'}<Txt style={{ color: C.coral }}>Then two more!</Txt></Txt><Txt style={s.muted}>Join Bunny in the orchard and put two little groups together.</Txt><View style={s.celebrateArt}><Image source={bunny} style={s.celebrateBunny} resizeMode="contain" /><Txt style={[s.bubble, { position: 'absolute', bottom: 16, left: 16 }]}>2 + 2 = ?</Txt></View><Txt style={[s.pill, { alignSelf: 'flex-start', marginBottom: 15 }]}>Swipe up through 5 scenes · then the story ends</Txt><Button title={finished ? 'See your story' : state.progress.currentSceneIndex ? 'Resume the story' : 'Play the story'} coral icon="play" onPress={enterStory} /><Txt style={s.note}>Two animated story videos, then three activities. Narration uses a synthetic voice.</Txt></>);
  return page(<>{chrome('math', 'LESSON COMPLETE')}<Txt style={[s.pill, { marginTop: 28, alignSelf: 'center' }]}>FIVE SCENES FINISHED</Txt><Txt style={[s.hero, s.center]}>You did it, {state.child.name}!</Txt><Txt style={[s.muted, s.center]}>You helped Bunny put apples together.</Txt><View style={s.celebrateArt}><Image source={bunny} resizeMode="contain" style={s.celebrateBunny} /><View style={s.sticker}><Icon name="award" size={30} /></View></View><View style={s.metricRow}><Metric value={`${scenes.length} / ${scenes.length}`} label="Story scenes" /><Metric value={state.summary.hints} label="Helpful hints" tint="#f9e5d6" /></View><Button coral title="Open homework adventure" icon="arrow-right" onPress={() => go('map')} /><Button secondary title="Review the story" onPress={() => { const first = scenes[0]; const saved = state.progress.scenes.find(p => p.sceneId === first.id); sceneRef.current = first.id; position.current = saved?.positionPercent ?? 0; movedRef.current = saved?.movedCount ?? 0; resetMedia(position.current); setVideoProgress(resumeRef.current); setFeedback(null); setPlaying(true); chapterRef.current = 0; setChapter(0); setScreen('lesson'); }} style={{ marginTop: 12 }} /><Button secondary title="Back to my garden" onPress={() => go('home')} style={{ marginTop: 12 }} /></>);
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background }, page: { paddingHorizontal: 23, flexGrow: 1 }, body: { fontFamily: 'DM Sans', color: C.foreground, fontSize: 15, lineHeight: 22 }, muted: { fontFamily: 'DM Sans', color: C.mutedForeground, fontSize: 15, lineHeight: 23, marginTop: 9 }, smallMuted: { fontFamily: 'DM Sans', color: C.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 3 },
  eyebrow: { fontFamily: 'DM Sans Bold', color: C.primary, fontSize: 10, letterSpacing: 1.5 }, brand: { fontFamily: 'Fredoka SemiBold', color: C.primary, fontSize: 22 }, hero: { fontFamily: 'Fredoka SemiBold', color: C.foreground, fontSize: 40, lineHeight: 43, marginTop: 13, letterSpacing: -1 }, title: { fontFamily: 'Fredoka SemiBold', color: C.foreground, fontSize: 34, lineHeight: 38 }, center: { textAlign: 'center' },
  topbar: { height: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 42, height: 42, borderRadius: 15, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }, avatar: { width: 44, height: 44, borderRadius: 24, backgroundColor: C.butter, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.paper }, avatarText: { fontFamily: 'Fredoka SemiBold', fontSize: 18, color: C.primary },
  button: { minHeight: 55, borderRadius: 19, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, paddingHorizontal: 15 }, buttonText: { fontFamily: 'DM Sans Bold', color: C.paper, fontSize: 15 }, coralButton: { backgroundColor: C.coral }, secondaryButton: { backgroundColor: C.paper, borderWidth: 1.5, borderColor: '#cbdbd1' },
  pill: { fontFamily: 'DM Sans Bold', fontSize: 10, color: C.primary, backgroundColor: '#e7f2e9', borderRadius: 30, overflow: 'hidden', paddingHorizontal: 13, paddingVertical: 9, letterSpacing: .3 }, feature: { minHeight: 282, borderRadius: 30, marginTop: 25, padding: 21, overflow: 'hidden', alignItems: 'flex-start' }, featureTitle: { fontFamily: 'Fredoka SemiBold', fontSize: 30, lineHeight: 31, color: C.foreground, marginTop: 13, zIndex: 1 }, featureDetail: { fontFamily: 'DM Sans', fontSize: 12, lineHeight: 18, color: C.foreground, marginTop: 7, width: '53%', zIndex: 1 }, featureBunny: { position: 'absolute', width: '57%', height: '84%', right: -11, bottom: -8 }, featureCta: { marginTop: 'auto', borderRadius: 30, backgroundColor: C.paper, paddingHorizontal: 16, paddingVertical: 11, zIndex: 1 }, featureCtaText: { fontFamily: 'DM Sans Bold', color: C.primary, fontSize: 12 },
  sectionTitle: { fontFamily: 'Fredoka SemiBold', color: C.foreground, fontSize: 23, marginTop: 27, marginBottom: 13 }, tileRow: { flexDirection: 'row', gap: 12 }, tile: { flex: 1, borderRadius: 24, minHeight: 151, padding: 17, justifyContent: 'space-between' }, tileTitle: { fontFamily: 'Fredoka SemiBold', fontSize: 20, lineHeight: 21, color: C.foreground }, curriculum: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: C.paper, padding: 16, borderRadius: 21, borderWidth: 1, borderColor: C.border, marginBottom: 9 }, rowTitle: { fontFamily: 'DM Sans Bold', color: C.foreground, fontSize: 14 },
  nav: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderColor: C.border, backgroundColor: C.paper, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around', paddingTop: 13 }, navItem: { alignItems: 'center', gap: 4, minWidth: 55 }, navLabel: { fontFamily: 'DM Sans Bold', fontSize: 9, color: C.mutedForeground },
  lesson: { paddingHorizontal: 21 }, lessonTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, progressDots: { flexDirection: 'row', gap: 5 }, progressDot: { width: 21, height: 6, borderRadius: 5, backgroundColor: '#bdd3c5' }, countBadge: { fontFamily: 'DM Sans Bold', color: C.foreground, fontSize: 11, backgroundColor: C.paper, padding: 9, borderRadius: 20 }, lessonHeading: { alignItems: 'center', paddingTop: 15 }, lessonTitle: { fontFamily: 'Fredoka SemiBold', color: C.foreground, fontSize: 35, lineHeight: 38, textAlign: 'center', marginTop: 7 }, lessonCaption: { fontFamily: 'DM Sans', color: C.foreground, fontSize: 13, textAlign: 'center', marginTop: 7, lineHeight: 18 }, lessonArt: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', gap: 8 }, orchard: { width: '100%', height: '80%' }, lessonBunny: { width: '53%', height: '51%' }, bubble: { fontFamily: 'Fredoka SemiBold', color: C.primary, fontSize: 22, textAlign: 'center', backgroundColor: C.paper, paddingHorizontal: 17, paddingVertical: 10, borderRadius: 20, overflow: 'hidden' }, appleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }, apples: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', maxWidth: 140 }, operator: { fontFamily: 'Fredoka SemiBold', color: C.primary, fontSize: 30 }, equation: { fontFamily: 'Fredoka SemiBold', fontSize: 38, color: C.primary, textAlign: 'center', marginVertical: 8 }, lessonBottom: { gap: 10, alignItems: 'center' }, controls: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 10 }, playButton: { width: 55, height: 55, borderRadius: 17, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' }, swipeTip: { fontFamily: 'DM Sans Bold', fontSize: 11, color: C.primary }, track: { height: 5, borderRadius: 8, backgroundColor: '#c7dacb', width: '100%', overflow: 'hidden' }, trackFill: { height: '100%', backgroundColor: C.primary, borderRadius: 8 },
  choices: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 10, minHeight: 60 }, choice: { width: 70, height: 65, borderWidth: 2, borderColor: '#cbdccc', borderRadius: 19, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' }, answerText: { fontFamily: 'Fredoka SemiBold', color: C.primary, fontSize: 30 }, selectedChoice: { borderColor: C.primary, backgroundColor: '#d9efe2', borderRadius: 19 }, dragItem: { width: 70, height: 65, borderRadius: 19, borderWidth: 2, borderColor: '#cbdccc', backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' }, hint: { backgroundColor: C.paper, padding: 11, borderWidth: 2, borderStyle: 'dashed', borderColor: '#e7b896', borderRadius: 20, alignItems: 'center', width: '100%' }, hintTitle: { fontFamily: 'Fredoka SemiBold', color: '#a45348', fontSize: 16 }, questionPanel: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, padding: 19, borderRadius: 27, marginTop: 24, alignItems: 'center', gap: 9 },
  celebrateArt: { backgroundColor: '#dceee1', borderRadius: 36, height: 280, alignItems: 'center', justifyContent: 'center', marginVertical: 23, overflow: 'hidden' }, celebrateBunny: { width: '69%', height: '94%' }, sticker: { position: 'absolute', bottom: 18, right: 23, padding: 13, borderRadius: 40, backgroundColor: C.butter }, metricRow: { flexDirection: 'row', gap: 9, marginVertical: 20 }, metric: { flex: 1, borderRadius: 17, backgroundColor: '#e4f0e7', padding: 12, minHeight: 69 }, metricNumber: { fontFamily: 'Fredoka SemiBold', color: C.foreground, fontSize: 23 }, metricLabel: { fontFamily: 'DM Sans Bold', color: '#62756a', fontSize: 10 }, note: { fontFamily: 'DM Sans', fontSize: 10, color: '#89948b', lineHeight: 15, textAlign: 'center', marginVertical: 17 },
  map: { height: 425, marginTop: 18, backgroundColor: '#dfefdb', borderRadius: 31, borderWidth: 5, borderColor: '#f4f6e8', overflow: 'hidden' }, mapPath: { position: 'absolute', width: '67%', height: '85%', borderWidth: 4, borderColor: '#b2d0af', borderRadius: 200, left: '16%', top: '8%', transform: [{ rotate: '-20deg' }] }, mapStop: { position: 'absolute', width: 76, height: 76, borderRadius: 23, alignItems: 'center', justifyContent: 'center', elevation: 2 }, mapLabel: { fontFamily: 'Fredoka SemiBold', color: C.primary, fontSize: 11 }, practiceVisual: { minHeight: 150, justifyContent: 'center', alignItems: 'center', gap: 10 }, dropZone: { fontFamily: 'Fredoka SemiBold', color: C.primary, fontSize: 22, textAlign: 'center', backgroundColor: '#eef7ed', borderWidth: 2, borderStyle: 'dashed', borderColor: '#bfd6c4', borderRadius: 16, minWidth: '80%', padding: 12, overflow: 'hidden' }, answerInput: { height: 64, borderWidth: 2, borderColor: '#c5d7cb', borderRadius: 19, backgroundColor: C.paper, textAlign: 'center', fontFamily: 'Fredoka SemiBold', color: C.primary, fontSize: 29 },
  parentCard: { borderRadius: 23, backgroundColor: C.paper, borderColor: C.border, borderWidth: 1, padding: 18, marginTop: 14 }, activity: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border }, insightRow: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }, dot: { width: 11, height: 11, borderRadius: 6, marginTop: 4 },
});