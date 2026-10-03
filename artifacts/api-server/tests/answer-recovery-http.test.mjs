import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

test('invalid answers do not write; correction, normalization and retry are safe', async () => {
  let token;
  const call = async (path, method = 'GET', body) => {
    const r = await fetch(`http://localhost:80/api${path}`, { method, headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: r.status, data: await r.json() };
  };
  token = (await call('/learning/session', 'POST')).data.token;
  for (const [page, wrong, correct] of [[4, '999', ' 3 '], [8, 'square', ' Circle ']]) {
    const run = (await call(`/textbooks/grade-1-math-example-book/pages/${page}/runs`, 'POST', { requestId: randomUUID() })).data;
    const path = `/activities/runs/${run.id}`;
    const input = { requestId: randomUUID(), questionId: run.questions[0].id, answer: { value: '???' } };
    const before = (await call(path)).data;
    for (let i = 0; i < 2; i++) {
      const rejected = await call(`${path}/attempts`, 'POST', input);
      assert.equal(rejected.status, 400);
      assert.equal(rejected.data.error, 'Expected a valid answer');
    }
    assert.deepEqual((await call(path)).data, before);
    const incorrect = await call(`${path}/attempts`, 'POST', { ...input, requestId: randomUUID(), answer: { value: wrong } });
    assert.equal(incorrect.status, 200);
    assert.equal(incorrect.data.correct, false);
    const corrected = { ...input, requestId: randomUUID(), answer: { value: correct } };
    const saved = await call(`${path}/attempts`, 'POST', corrected);
    assert.equal(saved.status, 200);
    assert.equal(saved.data.correct, true);
    assert.equal(saved.data.run.currentIndex, 1);
    const retry = await call(`${path}/attempts`, 'POST', corrected);
    assert.deepEqual(retry.data, saved.data);
    assert.equal(retry.data.run.attemptCount, 2);
  }
});