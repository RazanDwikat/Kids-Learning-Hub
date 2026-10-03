import type { ActivityAnswer, ActivityAttemptInput, ActivityQuestion } from '@workspace/api-client-react';

export type PendingActivityAnswer = { runId: string; data: ActivityAttemptInput };
export function readPendingAnswer(raw: string): PendingActivityAnswer | null {
  try {
    const p = JSON.parse(raw);
    if (!p || typeof p.runId !== 'string' || !p.runId || !p.data ||
      typeof p.data.questionId !== 'string' || !p.data.questionId ||
      typeof p.data.requestId !== 'string' || !p.data.requestId ||
      !p.data.answer || typeof p.data.answer !== 'object' || Array.isArray(p.data.answer)) return null;
    return p;
  } catch { return null; }
}
export function prepareActivityAnswer(q: ActivityQuestion, answer: ActivityAnswer): { answer: ActivityAnswer; error: string | null } {
  const normalized = typeof answer.value === 'string' ? { ...answer, value: answer.value.trim().toLowerCase() } : answer;
  let error: string | null = null;
  if (q.type === 'direct' || q.type === 'counting' || q.type === 'choice') {
    const value = normalized.value ?? '';
    if (Object.keys(normalized).length !== 1 || !(q.concept.toLowerCase().includes('shape') ? /^[a-z ]{1,30}$/.test(value) : /^\d{1,3}$/.test(value)))
      error = q.concept.toLowerCase().includes('shape') ? 'Write a shape name using letters.' : 'Write a number from 0 to 999.';
    else if (q.type === 'choice' && !q.options.includes(value)) error = 'Choose one of the answers shown.';
  } else if (q.type === 'drag' || q.type === 'ordering') {
    if (Object.keys(normalized).length !== 1 || !normalized.items || [...normalized.items].sort().join('\0') !== [...q.tokens].sort().join('\0'))
      error = 'Use each piece once before checking your answer.';
  } else if (q.type === 'matching') {
    const pairs = normalized.pairs;
    if (Object.keys(normalized).length !== 1 || !pairs || pairs.length !== q.left.length ||
      new Set(pairs.map(p => p.left)).size !== q.left.length || new Set(pairs.map(p => p.right)).size !== q.right.length ||
      pairs.some(p => !q.left.includes(p.left) || !q.right.includes(p.right))) error = 'Match each item once before checking your answer.';
  } else error = 'This question cannot be checked yet.';
  return { answer: normalized, error };
}
// Only these endpoint-specific, pre-write rejections are safe to release.
export function rejectedActivityAnswer(error: unknown): boolean {
  const e = error as { status?: number; data?: { error?: string } };
  return e?.status === 400 && [
    'Invalid attempt', 'Expected a valid answer', 'Answer must be an option',
    'Expected an ordering of the provided tokens', 'Expected each provided item matched once',
  ].includes(e.data?.error ?? '');
}