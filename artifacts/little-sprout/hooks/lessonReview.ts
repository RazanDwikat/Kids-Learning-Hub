import type { LearningScene, LearningStateProgress, LearningStateProgressScenesItem } from '@workspace/api-client-react';

export type SceneFeedback = { text: string; showApples: boolean };
export type EffectiveSceneProgress = Readonly<LearningStateProgressScenesItem & {
  completed: boolean;
  feedback: SceneFeedback | null;
}>;
export type ReviewSession = Readonly<{
  id: string;
  scenes: Readonly<Record<string, EffectiveSceneProgress>>;
}>;
type ReviewScene = Pick<LearningScene, 'id' | 'type' | 'operands'>;
export type ReviewAction =
  | { type: 'progress'; scene: ReviewScene; positionPercent: number; movedCount: number }
  | { type: 'answer'; scene: ReviewScene; answer: number }
  | { type: 'help'; scene: ReviewScene }
  | { type: 'complete'; scene: ReviewScene };

const emptyProgress = (sceneId: string): EffectiveSceneProgress => ({
  sceneId, positionPercent: 0, movedCount: 0, solved: false, completed: false, feedback: null,
});

/** A replay never seeds its interaction state from durable learning progress. */
export function createReviewSession(scenes: readonly Pick<LearningScene, 'id'>[], id: string): ReviewSession {
  return { id, scenes: Object.fromEntries(scenes.map(scene => [scene.id, emptyProgress(scene.id)])) };
}

/** Use for active scenes, off-screen previews, and navigation gates alike. */
export function effectiveSceneProgress(
  saved: LearningStateProgress | undefined,
  review: ReviewSession | null,
  sceneId: string,
): EffectiveSceneProgress {
  if (review) return review.scenes[sceneId] ?? emptyProgress(sceneId);
  const progress = saved?.scenes.find(scene => scene.sceneId === sceneId);
  return {
    ...emptyProgress(sceneId), ...progress,
    completed: !!saved?.completedSceneIds.includes(sceneId),
  };
}

export function canAdvanceScene(
  scene: ReviewScene | undefined,
  progress: EffectiveSceneProgress,
  pendingNeedsRetry = false,
): boolean {
  return !!scene && !pendingNeedsRetry && (
    scene.type === 'video' || progress.solved ||
    (scene.type === 'drag' && progress.movedCount === scene.operands.b)
  );
}

/** Pure local transitions: no API, query cache, or pending-attempt storage access. */
export function reduceReviewSession(session: ReviewSession, action: ReviewAction): ReviewSession {
  const previous = session.scenes[action.scene.id];
  if (!previous) return session;
  let next: EffectiveSceneProgress;
  switch (action.type) {
    case 'progress': {
      const movedCount = action.scene.type === 'drag'
        ? Math.max(0, Math.min(action.scene.operands.b, action.movedCount)) : previous.movedCount;
      next = {
        ...previous,
        positionPercent: Math.max(0, Math.min(100, Math.round(action.positionPercent))),
        movedCount,
        solved: previous.solved || (action.scene.type === 'drag' && movedCount === action.scene.operands.b),
      };
      break;
    }
    case 'answer': {
      if (action.scene.type !== 'choice' || previous.solved) return session;
      const correct = action.answer === action.scene.operands.a + action.scene.operands.b;
      next = {
        ...previous, solved: correct,
        feedback: {
          text: correct ? 'Wonderful! You got it!' : "Almost! Let's count together.",
          showApples: !correct,
        },
      };
      break;
    }
    case 'help':
      next = { ...previous, feedback: { text: "Let's count together.", showApples: true } };
      break;
    case 'complete':
      if (!canAdvanceScene(action.scene, previous)) return session;
      next = { ...previous, completed: true };
      break;
  }
  return { ...session, scenes: { ...session.scenes, [action.scene.id]: next } };
}

export function reviewCompleted(session: ReviewSession): boolean {
  const scenes = Object.values(session.scenes);
  return scenes.length > 0 && scenes.every(scene => scene.completed);
}