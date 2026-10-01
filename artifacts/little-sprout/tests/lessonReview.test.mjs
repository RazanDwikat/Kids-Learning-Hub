import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canAdvanceScene, createReviewSession, effectiveSceneProgress, reduceReviewSession, reviewCompleted,
} from '../hooks/lessonReview.ts';

const scenes = [
  { id: 'story', type: 'video', operands: { a: 2, b: 2 } },
  { id: 'groups', type: 'video', operands: { a: 2, b: 2 } },
  { id: 'drag', type: 'drag', operands: { a: 2, b: 2 } },
  { id: 'choice', type: 'choice', operands: { a: 2, b: 2 } },
  { id: 'last-choice', type: 'choice', operands: { a: 3, b: 2 } },
];
const [story, groups, drag, choice, lastChoice] = scenes;

function freeze(value) {
  Object.values(value).forEach(child => {
    if (child && typeof child === 'object') freeze(child);
  });
  return Object.freeze(value);
}
const saved = freeze({
  currentSceneIndex: 4,
  completedSceneIds: scenes.map(scene => scene.id),
  scenes: scenes.map(scene => ({
    sceneId: scene.id, positionPercent: 100, movedCount: scene.type === 'drag' ? 2 : 0,
    solved: scene.type !== 'video',
  })),
  lessonCompleted: true, completedAt: '2026-09-29T00:00:00.000Z',
});
const progress = (review, scene) => effectiveSceneProgress(saved, review, scene.id);
const act = (review, type, scene, extra = {}) => reduceReviewSession(review, { type, scene, ...extra });

test('every new review has a fresh scene-ID map, independent of saved 5/5 completion', () => {
  let first = createReviewSession(scenes, 'review-1');
  first = act(first, 'progress', drag, { movedCount: 2, positionPercent: 60 });
  first = act(first, 'answer', choice, { answer: 4 });
  first = act(first, 'help', lastChoice);
  const fresh = createReviewSession(scenes, 'review-2');
  assert.notEqual(first.id, fresh.id);
  assert.notEqual(first.scenes, fresh.scenes);
  assert.deepEqual(Object.keys(fresh.scenes), scenes.map(scene => scene.id));
  for (const scene of scenes) {
    assert.deepEqual(progress(fresh, scene), {
      sceneId: scene.id, positionPercent: 0, movedCount: 0,
      solved: false, completed: false, feedback: null,
    });
    assert.notEqual(first.scenes[scene.id], fresh.scenes[scene.id]);
  }
  assert.equal(saved.lessonCompleted, true);
  assert.equal(saved.completedSceneIds.length, 5);
});

test('effective selector preserves ordinary learning but does not leak saved answers into any review page', () => {
  const review = createReviewSession(scenes, 'review');
  for (const scene of scenes) {
    assert.equal(progress(null, scene).positionPercent, 100);
    assert.equal(progress(null, scene).completed, true);
    assert.equal(progress(review, scene).positionPercent, 0);
    assert.equal(progress(review, scene).completed, false);
  }
  assert.equal(canAdvanceScene(drag, progress(null, drag)), true);
  assert.equal(canAdvanceScene(drag, progress(review, drag)), false);
  assert.equal(canAdvanceScene(choice, progress(review, choice)), false);
  assert.equal(canAdvanceScene(lastChoice, progress(review, lastChoice)), false);
  assert.equal(canAdvanceScene(story, progress(review, story)), true);
  assert.equal(canAdvanceScene(story, progress(null, story), true), false, 'ordinary pending attempts still block navigation');
});

test('drag interaction is per scene, starts with both apples, and survives session backtracking', () => {
  const fresh = createReviewSession(scenes, 'review');
  let review = act(fresh, 'progress', drag, { movedCount: 1, positionPercent: 0 });
  assert.equal(progress(review, drag).movedCount, 1);
  assert.equal(canAdvanceScene(drag, progress(review, drag)), false);
  assert.equal(review.scenes.choice, fresh.scenes.choice);
  review = act(review, 'progress', drag, { movedCount: 2, positionPercent: 0 });
  review = act(review, 'complete', drag);
  review = act(review, 'help', choice);
  assert.equal(progress(review, drag).movedCount, 2);
  assert.equal(progress(review, drag).solved, true);
  assert.equal(progress(review, drag).completed, true);
  assert.equal(canAdvanceScene(drag, progress(review, drag)), true);
  assert.equal(progress(fresh, drag).movedCount, 0, 'previous state remains immutable');
  assert.equal(progress(review, lastChoice).feedback, null);
});

test('wrong answers and help are local and allow retry; each choice uses its own addition operands', () => {
  let review = createReviewSession(scenes, 'review');
  review = act(review, 'answer', choice, { answer: 3 });
  assert.equal(progress(review, choice).solved, false);
  assert.equal(progress(review, choice).feedback.showApples, true);
  assert.equal(canAdvanceScene(choice, progress(review, choice)), false);
  const blocked = act(review, 'complete', choice);
  assert.equal(blocked, review);
  review = act(review, 'help', choice);
  assert.equal(progress(review, choice).feedback.text, "Let's count together.");
  assert.equal(canAdvanceScene(choice, progress(review, choice)), false);
  review = act(review, 'answer', choice, { answer: 4 });
  assert.equal(progress(review, choice).solved, true);
  assert.equal(progress(review, choice).feedback.showApples, false);
  assert.equal(canAdvanceScene(choice, progress(review, choice)), true);
  assert.equal(progress(review, lastChoice).solved, false);
  review = act(review, 'answer', lastChoice, { answer: 4 });
  assert.equal(progress(review, lastChoice).solved, false, 'not a hard-coded answer of four');
  review = act(review, 'help', lastChoice);
  review = act(review, 'answer', lastChoice, { answer: 5 });
  assert.equal(canAdvanceScene(lastChoice, progress(review, lastChoice)), true);
  assert.equal(progress(review, choice).solved, true, 'backtracking preserves this session answer');
});

test('review playback resumes only its own session position, and replay can reset it to zero', () => {
  let review = createReviewSession(scenes, 'review');
  review = act(review, 'progress', story, { positionPercent: 38.2, movedCount: 0 });
  review = act(review, 'progress', groups, { positionPercent: 19, movedCount: 0 });
  assert.equal(progress(review, story).positionPercent, 38);
  assert.equal(progress(review, groups).positionPercent, 19);
  review = act(review, 'progress', story, { positionPercent: 0, movedCount: 0 });
  assert.equal(progress(review, story).positionPercent, 0);
  assert.equal(progress(review, groups).positionPercent, 19);
  assert.equal(progress(null, story).positionPercent, 100);
});

test('finishing review completes only the local session; a second review is uncompleted', () => {
  let review = createReviewSession(scenes, 'review-1');
  for (const scene of scenes) {
    if (scene.type === 'drag') review = act(review, 'progress', scene, { movedCount: scene.operands.b, positionPercent: 0 });
    if (scene.type === 'choice') review = act(review, 'answer', scene, { answer: scene.operands.a + scene.operands.b });
    assert.equal(reviewCompleted(review), false);
    review = act(review, 'complete', scene);
  }
  assert.equal(reviewCompleted(review), true);
  assert.equal(reviewCompleted(createReviewSession(scenes, 'review-2')), false);
  assert.equal(reviewCompleted(createReviewSession([], 'empty')), false);
  assert.equal(saved.lessonCompleted, true);
  assert.equal(saved.completedSceneIds.length, 5);
});

test('all replay transitions leave frozen durable progress and catalog exactly unchanged', () => {
  const before = JSON.stringify(saved);
  const catalog = freeze(structuredClone(scenes));
  const catalogBefore = JSON.stringify(catalog);
  let review = freeze(createReviewSession(catalog, 'review'));
  for (const scene of catalog) {
    progress(review, scene);
    review = freeze(act(review, 'help', scene));
    if (scene.type === 'choice') {
      review = freeze(act(review, 'answer', scene, { answer: -1 }));
      review = freeze(act(review, 'answer', scene, { answer: scene.operands.a + scene.operands.b }));
    }
    review = freeze(act(review, 'progress', scene, { movedCount: scene.operands.b, positionPercent: 100 }));
    review = freeze(act(review, 'complete', scene));
  }
  assert.equal(reviewCompleted(review), true);
  assert.equal(JSON.stringify(saved), before);
  assert.equal(JSON.stringify(catalog), catalogBefore);
});