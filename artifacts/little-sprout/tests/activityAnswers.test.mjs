import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareActivityAnswer, readPendingAnswer, rejectedActivityAnswer } from '../hooks/activityAnswers.ts';

const base = { type: 'direct', concept: 'Addition', options: [], tokens: [], left: [], right: [] };
test('numeric and shape answers normalize without treating a wrong answer as invalid', () => {
  for (const value of ['0', '999', ' 3 ']) assert.equal(prepareActivityAnswer(base, { value }).error, null);
  assert.ok(prepareActivityAnswer(base, { value: '1000' }).error);
  assert.ok(prepareActivityAnswer(base, { value: '-1' }).error);
  const q = { ...base, concept: 'Shapes' };
  assert.deepEqual(prepareActivityAnswer(q, { value: ' Circle ' }), { answer: { value: 'circle' }, error: null });
  assert.equal(prepareActivityAnswer(q, { value: 'square' }).error, null);
  assert.ok(prepareActivityAnswer(q, { value: '???' }).error);
});
test('choice, ordering and matching require structurally valid answers', () => {
  assert.ok(prepareActivityAnswer({ ...base, type: 'choice', options: ['3'] }, { value: '4' }).error);
  assert.equal(prepareActivityAnswer({ ...base, type: 'ordering', tokens: ['1', '1', '2'] }, { items: ['2', '1', '1'] }).error, null);
  assert.ok(prepareActivityAnswer({ ...base, type: 'ordering', tokens: ['1', '1', '2'] }, { items: ['2', '2', '1'] }).error);
  const q = { ...base, type: 'matching', left: ['a', 'b'], right: ['1', '2'] };
  assert.equal(prepareActivityAnswer(q, { pairs: [{ left: 'a', right: '2' }, { left: 'b', right: '1' }] }).error, null);
  assert.ok(prepareActivityAnswer(q, { pairs: [{ left: 'a', right: '2' }, { left: 'b', right: '2' }] }).error);
});
test('only definitive known validation errors release a pending attempt', () => {
  const code = 'ACTIVITY_ANSWER_REJECTED';
  for (const error of ['Expected a valid answer', 'Completely changed copy', '', undefined])
    assert.equal(rejectedActivityAnswer({ status: 400, data: { code, error } }), true);
  for (const status of [401, 404, 409, 500, 502, undefined])
    assert.equal(rejectedActivityAnswer({ status, data: { code } }), false);
  for (const code of [undefined, null, 42, 'FUTURE_CODE', 'ACTIVITY_REQUEST_ID_CONFLICT', 'ACTIVITY_RUN_COMPLETE', 'ACTIVITY_QUESTION_NOT_CURRENT'])
    for (const status of [400, 409])
      assert.equal(rejectedActivityAnswer({ status, data: { code, error: 'Expected a valid answer' } }), false);
  for (const error of [null, undefined, {}, { status: 400 }, { status: 400, data: null }])
    assert.equal(rejectedActivityAnswer(error), false);
  assert.equal(rejectedActivityAnswer(new Error('Network failed')), false);
  assert.equal(rejectedActivityAnswer({ status: 400, data: { error: 'Unknown' } }), false);
});
test('storage parsing preserves retry identity exactly and isolates unreadable data', () => {
  const p = { runId: 'r', data: { requestId: 'same-id', questionId: 'q', answer: { value: ' Circle ' } } };
  assert.deepEqual(readPendingAnswer(JSON.stringify(p)), p);
  for (const raw of ['{', 'null', '{}', '{"runId":"r","data":{}}']) assert.equal(readPendingAnswer(raw), null);
});