import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { useGetActivityCatalog, useStartActivityRun, useGetActivityRun, useSubmitActivityAttempt, getGetActivityRunQueryKey, getGetActivityCatalogQueryKey, getGetChildDashboardQueryKey } from '@workspace/api-client-react';
import type { ActivityAnswer, ActivityAttemptInput, ActivityRun, ActivitySummary } from '@workspace/api-client-react';
import { Action, Bunny, C, Card, Failure, Heading, Loading, Metric, Progress, T, styles as s } from './ui';
import { Question } from './Question';
import { HomeworkSetup } from './HomeworkSetup';
import { AdventureMap, TreasureCelebration } from './AdventureMap';

const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.floor(Math.random() * 16); return (c === 'x' ? r : (r & 3) | 8).toString(16); });
const pendingKey = 'sprout-activity-pending-v1';
type Pending = { runId: string; data: ActivityAttemptInput };

export function ActivityPages({ kind, onLesson, onHome, onParent }: { kind: 'homework' | 'practice'; lessonComplete: boolean; onLesson: () => void; onHome: () => void; onParent: () => void }) {
  const catalog = useGetActivityCatalog();
  const start = useStartActivityRun();
  const cache = useQueryClient();
  const [chosenMode, setMode] = useState<'practice' | 'exam' | null>(null);
  const mode = chosenMode ?? (catalog.data?.some(a => a.kind === 'exam' && a.activeRunId) ? 'exam' : 'practice');
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedRuns, setSavedRuns] = useState<Record<string, string>>({});
  useEffect(() => { AsyncStorage.getItem('sprout-last-activity-runs').then(raw => { if (raw) setSavedRuns(JSON.parse(raw)); }).catch(() => { /* Server catalog still provides every unfinished adventure. */ }); }, []);
  const startRequest = useRef<{ activityId: string; data: { requestId: string; restart: boolean } } | null>(null);
  const [starting, setStarting] = useState(false);
  const lock = useRef(false);
  const open = async (a: ActivitySummary, restart = false) => {
    if (lock.current) return;
    if (a.activeRunId && !restart) { setRunId(a.activeRunId); return; }
    lock.current = true; setStarting(true); setError(null);
    if (!startRequest.current || startRequest.current.activityId !== a.id || startRequest.current.data.restart !== restart) startRequest.current = { activityId: a.id, data: { restart, requestId: uuid() } };
    try {
      const run = await start.mutateAsync(startRequest.current);
      cache.setQueryData(getGetActivityRunQueryKey(run.id), run);
      const remembered = { ...savedRuns, [a.id]: run.id };
      setSavedRuns(remembered);
      await AsyncStorage.setItem('sprout-last-activity-runs', JSON.stringify(remembered));
      setRunId(run.id); startRequest.current = null;
      void cache.invalidateQueries({ queryKey: getGetActivityCatalogQueryKey() });
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not open this adventure. Try again.'); }
    finally { lock.current = false; setStarting(false); }
  };
  if (runId) return <RunPage runId={runId} onBack={() => setRunId(null)} onHome={onHome} onParent={onParent} />;
  if (kind === 'homework') return <HomeworkSetup onRun={setRunId} />;
  if (catalog.isPending) return <Loading />;
  if (catalog.isError) return <Failure retry={() => void catalog.refetch()} busy={catalog.isFetching} />;
  const activities = catalog.data.filter(a => a.kind === mode && (mode !== 'exam' || a.id === 'addition-adventure-v2' || !!a.activeRunId));
  return <><T style={s.eyebrow}>{mode === 'exam' ? 'EXAM · TREASURE ADVENTURE' : 'PRACTICE GARDEN'}</T><T style={s.title}>{mode === 'exam' ? 'Six little stops.\nOne big adventure.' : 'A little practice.\nA lot of growing.'}</T><T style={s.muted}>{mode === 'exam' ? 'Help Bunny reach the treasure. Solve each stop together, and try again whenever you need to.' : 'A gentle space to practice what you know.'}</T>
    {kind === 'practice' && <View style={s.row}>{(['practice', 'exam'] as const).map(m => <View key={m} style={{ flex: 1 }}><Action testID={`mode-${m}`} title={m === 'practice' ? 'Practice' : 'Exam'} secondary={mode !== m} onPress={() => setMode(m)} disabled={starting} /></View>)}</View>}
    <Bunny />
    {activities.length ? activities.map(a => <Card key={a.id}><Heading>{a.title}</Heading><T style={s.muted}>{a.questionCount} stops · {a.completedRuns} completed adventures</T>{a.bestScore !== null && <T>Best result: {a.bestScore} / {a.questionCount}</T>}<Action testID={`start-${a.kind}`} title={starting ? 'Opening…' : a.activeRunId ? 'Continue adventure' : a.completedRuns ? 'Start a new adventure' : 'Start adventure'} disabled={starting} onPress={() => void open(a, a.completedRuns > 0 && !a.activeRunId)} /></Card>) : <Card><Feather name="sun" size={28} color={C.primary} /><T>No activities here yet. Your addition story is ready whenever you are.</T><Action title="Explore addition" onPress={onLesson} /></Card>}
    {error && <Card><T accessibilityRole="alert">{error}</T><T style={s.muted}>Tap the adventure button again to retry safely.</T></Card>}
    {activities.filter(a => a.completedRuns > 0 && !a.activeRunId && savedRuns[a.id]).map(a => <Action key={a.id} title="See your latest results" secondary disabled={starting} onPress={() => setRunId(savedRuns[a.id])} />)}
  </>;
}

function RunPage({ runId, onBack, onHome, onParent }: { runId: string; onBack: () => void; onHome: () => void; onParent: () => void }) {
  const query = useGetActivityRun(runId);
  const mutation = useSubmitActivityAttempt();
  const cache = useQueryClient();
  const [answer, setAnswer] = useState<ActivityAnswer>({});
  const [showMap, setShowMap] = useState(true);
  const [showReward, setShowReward] = useState(false);
  const [hint, setHint] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; correct: boolean } | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const load = () => { setError(null); AsyncStorage.getItem(pendingKey).then(raw => { if (raw) setPending(JSON.parse(raw)); setLoaded(true); }).catch(() => setError('Could not read your saved answer. Retry before continuing.')); };
  useEffect(load, []);
  const refresh = () => { void cache.invalidateQueries({ queryKey: getGetActivityCatalogQueryKey() }); void cache.invalidateQueries({ queryKey: getGetChildDashboardQueryKey() }); };
  const send = async (p: Pending) => {
    const result = await mutation.mutateAsync(p);
    cache.setQueryData(getGetActivityRunQueryKey(p.runId), result.run);
    await AsyncStorage.removeItem(pendingKey);
    setPending(null); setAnswer({});
    setFeedback({ text: result.feedback, correct: result.correct }); refresh();
  };
  const submit = async () => {
    if (lock.current || !query.data || !loaded) return;
    lock.current = true; setSaving(true); setError(null);
    try {
      let p = pending;
      if (!p) {
        p = { runId, data: { questionId: query.data.questions[query.data.currentIndex].id, answer, requestId: uuid() } };
        await AsyncStorage.setItem(pendingKey, JSON.stringify(p)); setPending(p);
      }
      await send(p);
    } catch (e) { setError(e instanceof Error ? e.message : 'Your answer could not be saved. Please retry.'); }
    finally { lock.current = false; setSaving(false); }
  };
  if (!loaded) return error ? <Failure message={error} retry={load} /> : <Loading />;
  if (query.isPending) return <Loading />;
  if (query.isError || !query.data) return <Failure retry={() => void query.refetch()} busy={query.isFetching} />;
  const run: ActivityRun = query.data;
  const q = run.questions[run.currentIndex];
  const valid = q?.type === 'matching' ? answer.pairs?.length === q.left.length : q?.type === 'drag' || q?.type === 'ordering' ? answer.items?.length === q.tokens.length : !!answer.value;
  const banner = <>{pending && <Card><T>An answer is waiting for confirmation. Retry it before continuing.</T><Action title={saving ? 'Saving…' : 'Retry saved answer'} disabled={saving} onPress={() => void submit()} /></Card>}{error && <T accessibilityRole="alert" style={{ color: C.coral }}>{error}</T>}</>;
  if (feedback) return <><T style={s.eyebrow}>{run.kind.toUpperCase()} · YOUR ANSWER</T>{feedback.correct && run.kind !== 'practice' ? <AdventureMap index={run.currentIndex} total={run.total} blocked onOpen={() => {}} /> : <Bunny />}<Card tint={feedback.correct ? C.mint : C.butter}><T style={s.heading}>{feedback.correct ? 'You found the way!' : 'Every try helps you grow.'}</T><T accessibilityLiveRegion="polite">{feedback.text}</T></Card>{banner}<Action testID="continue-after-feedback" title={run.completedAt ? 'Open the treasure' : feedback.correct ? 'Keep going' : 'Try again'} disabled={saving || !!pending} onPress={() => { setFeedback(null); setHint(false); setShowMap(feedback.correct && run.kind !== 'practice'); }} /></>;
  if (run.completedAt && showReward && run.kind !== 'practice') return <><T style={s.eyebrow}>A MOMENT TO CELEBRATE</T><T style={s.title}>{run.reward?.enabled ? run.reward.title : 'Your effort is the treasure.'}</T><TreasureCelebration /><Card tint={C.mint}><T testID="adventure-reward-message">{run.reward?.enabled ? run.reward.message : 'You kept trying and helped Bunny all the way. Tell a grown-up what you discovered!'}</T>{run.reward?.enabled && <T style={s.muted}>Chosen by your grown-up. Check with them about when to celebrate together.</T>}</Card><Action title="Show a grown-up" onPress={onParent} /><Action title="Back to my garden" secondary onPress={onHome} /><Action title="Back to results" secondary onPress={() => setShowReward(false)} /></>;
  if (run.completedAt && run.kind !== 'practice') return <><T style={s.eyebrow}>TREASURE FOUND</T><T style={s.title}>You did it!</T><T>You completed your {run.kind === 'exam' ? 'Math Adventure' : 'homework adventure'}!</T><TreasureCelebration /><View style={s.row}><Metric value={`${run.currentIndex} / ${run.total}`} label="Stops explored" /><Metric value={run.attemptCount} label="Brave tries" /></View><Card tint={C.mint}><T>Every try helped you grow. Bunny is glad you kept going.</T><T style={s.muted}>{run.title}</T></Card>{banner}<Action testID="open-adventure-reward" title="See my celebration" onPress={() => setShowReward(true)} /><Action title="Show a grown-up" onPress={onParent} /><Action title="Back to my garden" secondary onPress={onHome} /><Action title="More adventures" secondary onPress={onBack} /></>;
  if (!run.completedAt && run.kind !== 'practice' && showMap) return <><T style={s.eyebrow}>{run.kind.toUpperCase()} · BUNNY’S TRAIL</T><T style={s.title}>Follow Bunny to treasure.</T><T style={s.muted}>{run.title}. Each solved puzzle opens the next stop.</T><Progress value={run.currentIndex} total={run.total} /><AdventureMap index={run.currentIndex} total={run.total} blocked={!!pending} onOpen={() => setShowMap(false)} />{banner}<Action testID="open-current-stop" title={`Go to stop ${run.currentIndex + 1}`} disabled={!!pending} onPress={() => setShowMap(false)} /><Action title="Adventure overview" secondary onPress={onBack} /></>;
  if (run.completedAt) return <><T style={s.eyebrow}>PRACTICE COMPLETE</T><T style={s.title}>Look how you’ve grown!</T><Bunny /><View style={s.row}><Metric value={`${run.currentIndex} / ${run.total}`} label="Questions finished" /><Metric value={`${run.correctCount} / ${run.total}`} label="Correct answers" /></View>{banner}<Action title="Show a grown-up" onPress={onParent} /><Action title="Back to my garden" secondary onPress={onHome} /><Action title="More adventures" secondary onPress={onBack} /></>;
  if (run.kind === 'homework' && showMap) return <><T style={s.eyebrow}>ADDITION · APPLE TRAIL</T><T style={s.title}>Follow Bunny’s trail.</T><T style={s.muted}>Each finished puzzle opens the next stop.</T><Progress value={run.currentIndex} total={run.total} /><View style={{ backgroundColor: C.muted, borderRadius: 30, padding: 24, gap: 12 }}>{run.questions.map((question, i) => <View key={question.id} style={{ alignItems: i % 2 ? 'flex-end' : 'flex-start' }}><Pressable testID={`homework-stop-${i + 1}`} disabled={i !== run.currentIndex || !!pending} onPress={() => setShowMap(false)} style={[s.choice, { width: 110, minHeight: 88 }, i <= run.currentIndex && s.selected]}><Feather name={i < run.currentIndex ? 'check' : i === run.currentIndex ? 'map-pin' : 'lock'} size={26} color={C.primary} /><T>Stop {i + 1}</T></Pressable></View>)}<View style={{ alignItems: 'center', padding: 15 }}><Feather name="gift" size={35} color={C.primary} /><T>Treasure</T></View></View>{banner}<Action title={`Go to stop ${run.currentIndex + 1}`} disabled={!!pending} onPress={() => setShowMap(false)} /><Action title="Homework overview" secondary onPress={onBack} /></>;
  return <><Action title={run.kind !== 'practice' ? 'Back to trail' : 'Back to activities'} secondary onPress={() => run.kind !== 'practice' ? setShowMap(true) : onBack()} disabled={saving} /><T style={s.eyebrow}>{run.kind.toUpperCase()} · STOP {run.currentIndex + 1} OF {run.total}</T><Progress value={run.currentIndex} total={run.total} />{q ? <Question key={q.id} question={q} answer={answer} onChange={setAnswer} disabled={saving || !!pending} /> : <T>No question is available. Return to your activities and retry.</T>}{banner}<Action testID="check-activity-answer" title={saving ? 'Saving your answer…' : 'Check my answer'} disabled={!q || !valid || saving || !!pending} onPress={() => void submit()} /><Action testID="activity-hint" title={hint ? 'Hide my hint' : 'A little hint, please'} secondary onPress={() => setHint(!hint)} />{hint && <Card tint={C.butter}><T>{q?.type === 'ordering' ? 'Find the smallest number first. Which number comes next when you count?' : q?.type === 'counting' ? 'Touch each picture once. Say one number for each picture.' : q?.type === 'matching' ? 'Solve one group at a time, then find its partner.' : q?.concept?.toLowerCase().includes('shape') ? 'Think about the edges. Is it round, or does it have corners?' : q?.prompt.includes('-') ? 'Start with the first number. Take away the second number. Count what is left.' : 'Try using your fingers or little objects. Count each group slowly.'}</T></Card>}<T style={[s.muted, { textAlign: 'center', marginTop: 8 }]}>Take your time. You can try again when you need to.</T></>;
}