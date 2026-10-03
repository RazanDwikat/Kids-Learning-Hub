import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { getActivityRun, useGetActivityCatalog, useStartActivityRun, useGetActivityRun, useSubmitActivityAttempt, getGetActivityRunQueryKey, getGetActivityCatalogQueryKey, getGetChildDashboardQueryKey } from '@workspace/api-client-react';
import type { ActivityAnswer, ActivityAttemptInput, ActivityRun, ActivitySummary } from '@workspace/api-client-react';
import { Action, Bunny, C, Card, Failure, Heading, Loading, Metric, Progress, T, styles as s } from './ui';
import { Question } from './Question';
import { HomeworkSetup } from './HomeworkSetup';
import { AdventureMap, TreasureCelebration } from './AdventureMap';
import { prepareActivityAnswer, readPendingAnswer, rejectedActivityAnswer } from '../../hooks/activityAnswers';

const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.floor(Math.random() * 16); return (c === 'x' ? r : (r & 3) | 8).toString(16); });
const pendingKey = 'sprout-activity-pending-v1';
type Pending = { runId: string; data: ActivityAttemptInput };

export function ActivityPages({ kind, onLesson, onHome, onParent, onShowMap }: { kind: 'homework' | 'practice'; lessonComplete: boolean; onLesson: () => void; onHome: () => void; onParent: () => void; onShowMap?: () => void }) {
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
  if (runId) return <RunPage key={runId} runId={runId} onBack={() => setRunId(null)} onHome={onHome} onParent={onParent} onShowMap={onShowMap} />;
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

function RunPage({ runId, onBack, onHome, onParent, onShowMap }: { runId: string; onBack: () => void; onHome: () => void; onParent: () => void; onShowMap?: () => void }) {
  const query = useGetActivityRun(runId);
  const mutation = useSubmitActivityAttempt();
  const cache = useQueryClient();
  const [answer, setAnswer] = useState<ActivityAnswer>({});
  const [showMap, setShowMap] = useState(true);
  // Only a newly confirmed answer starts a journey; server progress on reload is stationary.
  const [transitionFrom, setTransitionFrom] = useState<number | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [hint, setHint] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; correct: boolean } | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [unreadable, setUnreadable] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const load = () => { setError(null); AsyncStorage.getItem(pendingKey).then(raw => {
    if (raw) { const parsed = readPendingAnswer(raw); setPending(parsed); setUnreadable(parsed ? null : raw); }
    setLoaded(true);
  }).catch(() => setError('Could not read your saved answer. Retry before continuing.')); };
  useEffect(load, []);
  const refresh = () => { void cache.invalidateQueries({ queryKey: getGetActivityCatalogQueryKey() }); void cache.invalidateQueries({ queryKey: getGetChildDashboardQueryKey() }); };
  const send = async (p: Pending) => {
    const result = await mutation.mutateAsync(p);
    // Keep the persisted idempotency key until removal succeeds. A failed removal
    // (or an uncertain network response) must be retried, not animated as a new save.
    await AsyncStorage.removeItem(pendingKey);
    const from = result.run.questions.findIndex(question => question.id === p.data.questionId);
    if (p.runId !== runId) {
      // Pending answers are shared across activities; confirming an older run
      // must not animate or replace the currently open run's question.
      setError('Your saved answer in another adventure was confirmed. You can continue here.');
    } else if (result.correct && result.run.kind !== 'practice') {
      setFeedback(null);
      setHint(false);
      setShowMap(true);
      setTransitionFrom(from >= 0 && result.run.currentIndex > from ? from : null);
      onShowMap?.();
    } else {
      setFeedback({ text: result.feedback, correct: result.correct });
    }
    cache.setQueryData(getGetActivityRunQueryKey(p.runId), result.run);
    setPending(null); setAnswer({});
    refresh();
  };
  const submit = async () => {
    if (lock.current || !query.data || !loaded || unreadable !== null) return;
    lock.current = true; setSaving(true); setError(null);
    let p = pending;
    try {
      if (!p) {
        const question = query.data.questions[query.data.currentIndex];
        if (!question) throw new Error('No question is available to save. Return to your activities and retry.');
        const prepared = prepareActivityAnswer(question, answer);
        if (prepared.error) throw new Error(prepared.error);
        p = { runId, data: { questionId: question.id, answer: prepared.answer, requestId: uuid() } };
        await AsyncStorage.setItem(pendingKey, JSON.stringify(p)); setPending(p);
      }
      await send(p);
    } catch (e) {
      if (p && rejectedActivityAnswer(e)) {
        try {
          await AsyncStorage.removeItem(pendingKey);
          setPending(null);
          if (p.runId === runId && p.data.questionId === query.data.questions[query.data.currentIndex]?.id) {
            setAnswer(typeof p.data.answer.value === 'string' ? { value: p.data.answer.value } : {});
            setShowMap(false);
          }
          setError('That answer could not be accepted. Please edit your answer and check it again. Your saved progress is unchanged.');
        } catch { setError('Could not unlock your saved answer. Retry to finish recovery safely.'); }
      } else setError(e instanceof Error ? e.message : 'Your answer could not be saved. Please retry.');
    }
    finally { lock.current = false; setSaving(false); }
  };
  const reconcile = async () => {
    if (lock.current) return;
    lock.current = true; setSaving(true);
    try {
      const saved = await getActivityRun(pending?.runId ?? runId);
      cache.setQueryData(getGetActivityRunQueryKey(saved.id), saved);
      if (pending && !saved.completedAt && saved.questions[saved.currentIndex]?.id === pending.data.questionId) {
        setError('This answer still needs confirmation. Retry the saved answer before continuing.');
        return;
      }
      // Archive only the unusable pending entry, never profile or learning storage.
      const raw = await AsyncStorage.getItem(pendingKey);
      if (raw !== null) await AsyncStorage.setItem(`${pendingKey}-recovery`, raw);
      await AsyncStorage.removeItem(pendingKey);
      setPending(null); setUnreadable(null); setAnswer({});
      setError('Saved progress restored. You can continue from your current stop.');
      refresh();
    } catch { setError('Could not check saved progress. Your saved answer is still protected. Please retry.'); }
    finally { lock.current = false; setSaving(false); }
  };
  if (!loaded) return error ? <Failure message={error} retry={load} /> : <Loading />;
  if (query.isPending) return <Loading />;
  if (query.isError || !query.data) return <Failure retry={() => void query.refetch()} busy={query.isFetching} />;
  const run: ActivityRun = query.data;
  if (unreadable !== null) return <Card><T>Your saved answer cannot be read. Restore your confirmed progress to continue; the unreadable answer will be kept separately for recovery.</T>{error && <T accessibilityRole="alert">{error}</T>}<Action title="Restore saved progress" disabled={saving} onPress={() => void reconcile()} /></Card>;
  const q = run.questions[run.currentIndex];
  const validation = q ? prepareActivityAnswer(q, answer) : null;
  const valid = !!validation && !validation.error;
  const banner = <>{pending && <Card><T>An answer is waiting for confirmation. Retry it before continuing.</T><Action title={saving ? 'Saving…' : 'Retry saved answer'} disabled={saving} onPress={() => void submit()} /><Action title="Check saved progress" secondary disabled={saving} onPress={() => void reconcile()} /></Card>}{error && <T accessibilityRole="alert" style={{ color: C.coral }}>{error}</T>}{!pending && Object.keys(answer).length > 0 && validation?.error && <T accessibilityRole="alert">{validation.error}</T>}</>;
  if (transitionFrom !== null && run.kind !== 'practice') return <><T style={s.eyebrow}>{run.kind.toUpperCase()} · BUNNY’S TRAIL</T><T style={s.title}>Bunny is on the move!</T><T style={s.muted}>You found the way. Follow Bunny to {run.completedAt ? 'the treasure' : 'the next stop'}.</T><Progress value={run.currentIndex} total={run.total} /><AdventureMap index={run.currentIndex} total={run.total} blocked onOpen={() => {}} transitionFrom={transitionFrom} onArrive={() => setTransitionFrom(null)} /></>;
  if (feedback) return <><T style={s.eyebrow}>{run.kind.toUpperCase()} · YOUR ANSWER</T><Bunny /><Card tint={feedback.correct ? C.mint : C.butter}><T style={s.heading}>{feedback.correct ? 'You found the way!' : 'Every try helps you grow.'}</T><T accessibilityLiveRegion="polite">{feedback.text}</T></Card>{banner}<Action testID="continue-after-feedback" title={run.completedAt ? 'Open the treasure' : feedback.correct ? 'Keep going' : 'Try again'} disabled={saving || !!pending} onPress={() => { setFeedback(null); setHint(false); setShowMap(feedback.correct && run.kind !== 'practice'); }} /></>;
  if (run.completedAt && showReward && run.kind !== 'practice') return <><T style={s.eyebrow}>A MOMENT TO CELEBRATE</T><T style={s.title}>{run.reward?.enabled ? run.reward.title : 'Your effort is the treasure.'}</T><TreasureCelebration /><Card tint={C.mint}><T testID="adventure-reward-message">{run.reward?.enabled ? run.reward.message : 'You kept trying and helped Bunny all the way. Tell a grown-up what you discovered!'}</T>{run.reward?.enabled && <T style={s.muted}>Chosen by your grown-up. Check with them about when to celebrate together.</T>}</Card><Action title="Show a grown-up" onPress={onParent} /><Action title="Back to my garden" secondary onPress={onHome} /><Action title="Back to results" secondary onPress={() => setShowReward(false)} /></>;
  if (run.completedAt && run.kind !== 'practice') return <><T style={s.eyebrow}>TREASURE FOUND</T><T style={s.title}>You did it!</T><T>You completed your {run.kind === 'exam' ? 'Math Adventure' : 'homework adventure'}!</T><TreasureCelebration /><View style={s.row}><Metric value={`${run.currentIndex} / ${run.total}`} label="Stops explored" /><Metric value={run.attemptCount} label="Brave tries" /></View><Card tint={C.mint}><T>Every try helped you grow. Bunny is glad you kept going.</T><T style={s.muted}>{run.title}</T></Card>{banner}<Action testID="open-adventure-reward" title="See my celebration" onPress={() => setShowReward(true)} /><Action title="Show a grown-up" onPress={onParent} /><Action title="Back to my garden" secondary onPress={onHome} /><Action title="More adventures" secondary onPress={onBack} /></>;
  if (!run.completedAt && run.kind !== 'practice' && showMap) return <><T style={s.eyebrow}>{run.kind.toUpperCase()} · BUNNY’S TRAIL</T><T style={s.title}>Follow Bunny to treasure.</T><T style={s.muted}>{run.title}. Each solved puzzle opens the next stop.</T><Progress value={run.currentIndex} total={run.total} /><AdventureMap index={run.currentIndex} total={run.total} blocked={!!pending || saving} onOpen={() => setShowMap(false)} />{banner}<Action testID="open-current-stop" title={`Go to stop ${run.currentIndex + 1}`} disabled={!!pending || saving} onPress={() => setShowMap(false)} /><Action title="Adventure overview" secondary onPress={onBack} /></>;
  if (run.completedAt) return <><T style={s.eyebrow}>PRACTICE COMPLETE</T><T style={s.title}>Look how you’ve grown!</T><Bunny /><View style={s.row}><Metric value={`${run.currentIndex} / ${run.total}`} label="Questions finished" /><Metric value={`${run.correctCount} / ${run.total}`} label="Correct answers" /></View>{banner}<Action title="Show a grown-up" onPress={onParent} /><Action title="Back to my garden" secondary onPress={onHome} /><Action title="More adventures" secondary onPress={onBack} /></>;
  return <><Action title={run.kind !== 'practice' ? 'Back to trail' : 'Back to activities'} secondary onPress={() => { if (run.kind !== 'practice') { setShowMap(true); onShowMap?.(); } else onBack(); }} disabled={saving} /><T style={s.eyebrow}>{run.kind.toUpperCase()} · STOP {run.currentIndex + 1} OF {run.total}</T><Progress value={run.currentIndex} total={run.total} />{q ? <Question key={q.id} question={q} answer={answer} onChange={setAnswer} disabled={saving || !!pending} /> : <T>No question is available. Return to your activities and retry.</T>}{banner}<Action testID="check-activity-answer" title={saving ? 'Saving your answer…' : 'Check my answer'} disabled={!q || !valid || saving || !!pending} onPress={() => void submit()} /><Action testID="activity-hint" title={hint ? 'Hide my hint' : 'A little hint, please'} secondary onPress={() => setHint(!hint)} />{hint && <Card tint={C.butter}><T>{q?.type === 'ordering' ? 'Find the smallest number first. Which number comes next when you count?' : q?.type === 'counting' ? 'Touch each picture once. Say one number for each picture.' : q?.type === 'matching' ? 'Solve one group at a time, then find its partner.' : q?.concept?.toLowerCase().includes('shape') ? 'Think about the edges. Is it round, or does it have corners?' : q?.prompt.includes('-') ? 'Start with the first number. Take away the second number. Count what is left.' : 'Try using your fingers or little objects. Count each group slowly.'}</T></Card>}<T style={[s.muted, { textAlign: 'center', marginTop: 8 }]}>Take your time. You can try again when you need to.</T></>;
}