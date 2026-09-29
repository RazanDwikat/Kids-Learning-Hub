import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useListTextbooks, useListTextbookPages, getListTextbookPagesQueryKey, useGetHomeworkPhotoStatus, useStartTextbookHomework, getGetActivityRunQueryKey, getGetActivityCatalogQueryKey, useGetActivityCatalog } from '@workspace/api-client-react';
import { Action, Card, Failure, Heading, Loading, T, styles as s } from './ui';
import { HomeworkCamera } from './HomeworkCamera';
import type { CapturedPage } from './HomeworkCamera';
import type { ActivityQuestion } from '@workspace/api-client-react';

// Transcribed from the supplied example book, printed pages 4, 5, 7 and 8.
const printedQuestions: Record<number, string[]> = {
  4: ['1 + 2 = ____', '2 + 3 = ____', '4 + 1 = ____', '3 + 3 = ____'],
  5: ['1 + 2 = ____', '2 + 3 = ____', '4 + 1 = ____', '3 + 3 = ____', '5 + 2 = ____', '6 + 1 = ____', '4 + 4 = ____', '2 + 7 = ____', '5 + 5 = ____', '3 + 6 = ____'],
  7: ['4 - 1 = ____', '5 - 3 = ____', '6 - 2 = ____', '7 - 4 = ____', '8 - 3 = ____', '9 - 5 = ____', '10 - 4 = ____', '6 - 6 = ____', '8 - 2 = ____', '9 - 3 = ____'],
  8: ['A ball is a ______________ shape.', 'A door is a ______________ shape.', 'A pizza slice is a ______________ shape.'],
};
export function HomeworkSetup({ onRun }: { onRun: (id: string) => void }) {
  const books = useListTextbooks();
  const catalog = useGetActivityCatalog();
  const [path, setPath] = useState<'textbook' | 'scan'>('textbook');
  const book = books.data?.find(b => b.title === 'Grade 1 Math Example Book')?.id ?? '';
  const [page, setPage] = useState<number | null>(null);
  const pages = useListTextbookPages(book, { query: { queryKey: getListTextbookPagesQueryKey(book), enabled: !!book } });
  const start = useStartTextbookHomework();
  const cache = useQueryClient();
  const request = useRef<{ key: string; id: string } | null>(null);
  const [error, setError] = useState('');
  const selected = pages.data?.find(p => p.number === page);
  const activity = catalog.data?.find(a => a.id === selected?.activityId);
  const begin = async () => {
    if (!selected || start.isPending) return;
    if (activity?.activeRunId) { onRun(activity.activeRunId); return; }
    const key = `${book}-${page}`;
    if (request.current?.key !== key) request.current = { key, id: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16); }) };
    setError('');
    try {
      const run = await start.mutateAsync({ bookId: book, pageNumber: selected.number, data: { requestId: request.current.id, restart: !!activity?.completedRuns } });
      cache.setQueryData(getGetActivityRunQueryKey(run.id), run); request.current = null;
      void cache.invalidateQueries({ queryKey: getGetActivityCatalogQueryKey() }); onRun(run.id);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not open the homework. Try again.'); }
  };
  return <><T style={s.eyebrow}>HOMEWORK · START WITH A GROWN-UP</T><T style={s.title}>Schoolwork becomes{'\n'}a little adventure.</T><T style={s.muted}>Choose the assigned page or photograph it. Bunny will guide your child one question at a time.</T>
    <View style={s.row}><Action testID="homework-textbook" title="Choose textbook page" secondary={path !== 'textbook'} onPress={() => setPath('textbook')} /><Action testID="homework-scan" title="Scan homework" secondary={path !== 'scan'} onPress={() => setPath('scan')} /></View>
    {catalog.data?.filter(a => a.kind === 'homework' && a.activeRunId).map(a => <Card key={a.id}><T>{a.title}</T><Action testID={`continue-homework-${a.id}`} title="Continue adventure" onPress={() => onRun(a.activeRunId!)} /></Card>)}
    {path === 'scan' && <ScanHomework />}
    {path === 'textbook' && (books.isPending ? <Loading /> : books.isError ? <Failure retry={() => void books.refetch()} /> : <Card><Heading>Find your page</Heading>
      <T style={s.muted}>Grade 1 · Math · Grade 1 Math Example Book</T>
      {!!book ? <><T style={s.eyebrow}>PRINTED PAGE NUMBER</T>{pages.isPending ? <Loading /> : pages.isError ? <Failure retry={() => void pages.refetch()} /> : <View style={s.row}>{pages.data?.map(p => <Action key={p.number} testID={`homework-page-${p.number}`} title={`${p.number}`} secondary={page !== p.number} disabled={start.isPending} onPress={() => setPage(p.number)} />)}</View>}<T style={s.muted}>Only pages in this book are listed. Worked examples and the answer key do not create homework.</T></> : <T accessibilityRole="alert">The Grade 1 Math Example Book is unavailable. Try again later.</T>}
      {selected && <><Heading>{selected.title}</Heading><T style={s.muted}>{selected.lesson} · {selected.exerciseCount} questions</T>{selected.activityId ? <><T>Review the questions with your grown-up.</T>{books.data.find(b => b.id === book)?.title === 'Grade 1 Math Example Book' && printedQuestions[selected.number]?.map((prompt, i) => <T key={i} testID={`homework-preview-${i + 1}`}>{i + 1}. {prompt}</T>)}<Action testID="start-textbook-homework" title={start.isPending ? 'Opening…' : activity?.activeRunId ? 'Continue this homework' : 'Start this homework'} disabled={start.isPending} onPress={() => void begin()} /></> : <T>This page has no written homework questions. Choose page 4, 5, 7 or 8 to begin.</T>}</>}
      {!!error && <T accessibilityRole="alert">{error} Your page selection is kept. Tap start to retry.</T>}
      {!books.data.length && <T>No textbooks are available yet. Please check again later.</T>}
    </Card>)}
  </>;
}

// Recognition boundary: no fabricated extraction. A provider must return reviewed,
// typed questions and a persisted activity before this screen may start a run.
export type HomeworkRecognitionProvider = {
  recognize: (photo: CapturedPage) => Promise<{ reviewId: string; questions: ActivityQuestion[] }>;
  approve: (reviewId: string, questionIds: string[]) => Promise<{ id: string }>;
};
export function ScanHomework({ provider, onRun }: { provider?: HomeworkRecognitionProvider; onRun?: (id: string) => void } = {}) {
  const [photo, setPhoto] = useState<CapturedPage | null>(null);
  const [stage, setStage] = useState<'photo' | 'checking' | 'unavailable' | 'error' | 'review' | 'starting'>('photo');
  const [review, setReview] = useState<{ reviewId: string; questions: ActivityQuestion[] } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reviewError, setReviewError] = useState('');
  const status = useGetHomeworkPhotoStatus();
  const analyze = async () => {
    setStage('checking');
    if (provider && photo) {
      try {
        const result = await provider.recognize(photo);
        setReview(result); setSelectedIds(result.questions.map(q => q.id)); setStage('review');
      } catch { setStage('error'); }
      return;
    }
    const result = await status.refetch();
    setStage(result.isError ? 'error' : 'unavailable');
  };
  return <><HomeworkCamera photo={photo} onPhoto={value => { setPhoto(value); setStage('photo'); setReview(null); setReviewError(''); }} disabled={stage === 'checking' || stage === 'starting'} />
    {photo && <Card><T style={s.eyebrow}>PHOTO → RECOGNITION → PARENT REVIEW → ADVENTURE</T><T>Check that the photo is clear before asking us to read it.</T><Action testID="analyze-homework-photo" title={stage === 'checking' ? 'Checking recognition service…' : 'Analyze this page'} disabled={stage === 'checking'} onPress={() => void analyze()} />
      {stage === 'checking' && <Loading />}
      {stage === 'error' && <Failure message="We could not check the recognition service. Your photo is still here." retry={() => void analyze()} />}
      {stage === 'unavailable' && <><Heading>Page reading is not connected yet.</Heading><T testID="homework-recognition-unavailable">{status.data?.message ?? 'Automatic question recognition is not available yet.'}</T><T style={s.muted}>No questions have been extracted and your photo has not been uploaded. When page reading is connected, a grown-up will review the identified questions here before an adventure begins. For now, choose a textbook page.</T></>}
      {(stage === 'review' || stage === 'starting') && review && <><Heading>Grown-up, check these questions.</Heading><T>Compare each question with your photo. Keep only the questions that were read correctly.</T>{review.questions.length ? review.questions.map((q, i) => <Card key={q.id}><T>{i + 1}. {q.prompt}</T><Action testID={`review-question-${i + 1}`} title={selectedIds.includes(q.id) ? 'Included · tap to leave out' : 'Include question'} secondary={!selectedIds.includes(q.id)} disabled={stage === 'starting'} onPress={() => setSelectedIds(ids => ids.includes(q.id) ? ids.filter(id => id !== q.id) : [...ids, q.id])} /></Card>) : <T>No questions were identified. Retake the photo with the whole page in good light.</T>}<Action testID="approve-scanned-homework" title={stage === 'starting' ? 'Preparing adventure…' : 'Approve questions and start'} disabled={!selectedIds.length || !provider || !onRun || stage === 'starting'} onPress={() => { if (!provider || !onRun) return; setStage('starting'); setReviewError(''); provider.approve(review.reviewId, selectedIds).then(run => onRun(run.id)).catch(() => { setStage('review'); setReviewError('Could not prepare the adventure. Your reviewed questions are kept. Please retry.'); }); }} />{!!reviewError && <T accessibilityRole="alert">{reviewError}</T>}</>}
    </Card>}
  </>;
}