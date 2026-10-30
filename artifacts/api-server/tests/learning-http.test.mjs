import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Run against a development server and disposable database.
test("anonymous child lessons persist, isolate, gate completion and deduplicate retries", async () => {
  const base = process.env.TEST_API_URL || "http://127.0.0.1:3000/api";
  async function call(path, method = "GET", token, body) {
    const response = await fetch(base + path, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json() };
  }
    assert.equal((await call("/healthz")).status, 200, "start the API before testing");
    assert.equal((await call("/learning/state")).status, 401);
    assert.equal((await call("/learning/state", "GET", "invalid")).status, 401);
    const one = await call("/learning/session", "POST");
    const two = await call("/learning/session", "POST");
    assert.equal(one.status, 201);
    assert.equal(two.status, 201);
    assert.notEqual(one.data.token, two.data.token);
    assert.deepEqual(one.data.state.lesson.scenes.map(s => s.index), [0, 1, 2, 3, 4]);
    assert.ok(one.data.state.lesson.scenes.every(s => !Object.hasOwn(s, "answer")), "correct answers must stay server-side");
    assert.equal(one.data.state.grade.id, "grade-1");
    assert.equal(one.data.state.subject.id, "math");
    assert.equal(one.data.state.lesson.id, "addition");
    const token = one.data.token;
    const scene = id => `/learning/scenes/addition-${id}`;
    assert.equal((await call(scene(1) + "/progress", "PATCH", token, { positionPercent: 101 })).status, 400);
    assert.equal((await call(scene(1) + "/progress", "PATCH", two.data.token, { positionPercent: 1 })).status, 200);
    assert.equal((await call("/learning/state", "GET", token)).data.progress.scenes[0].positionPercent, 0);
    assert.equal((await call(scene(4) + "/attempts", "POST", token, { requestId: randomUUID(), answer: 5 })).status, 409);
    assert.equal((await call(scene(3) + "/advance", "POST", token)).status, 409);
    assert.equal((await call(scene(3) + "/progress", "PATCH", token, { positionPercent: 20, movedCount: 1 })).status, 409);
    assert.equal((await call(scene(1) + "/progress", "PATCH", token, { positionPercent: 35 })).status, 200);
    assert.equal((await call(scene(1) + "/progress", "PATCH", token, { positionPercent: 25 })).status, 409);
    assert.equal((await call(scene(1) + "/advance", "POST", token)).status, 200);
    assert.equal((await call(scene(1) + "/advance", "POST", token)).data.state.progress.currentSceneIndex, 1);
    assert.equal((await call(scene(2) + "/advance", "POST", token)).status, 200);
    assert.equal((await call(scene(3) + "/progress", "PATCH", token, { positionPercent: 50, movedCount: 1 })).status, 200);
    assert.equal((await call(scene(3) + "/advance", "POST", token)).status, 409);
    assert.equal((await call(scene(3) + "/progress", "PATCH", token, { positionPercent: 100, movedCount: 2 })).status, 200);
    assert.equal((await call(scene(3) + "/progress", "PATCH", token, { positionPercent: 100, movedCount: 2 })).data.state.summary.attempts, 1);
    assert.equal((await call(scene(3) + "/advance", "POST", token)).status, 200);
    const badId = randomUUID();
    const bad = await call(scene(4) + "/attempts", "POST", token, { requestId: badId, answer: 4 });
    assert.equal(bad.status, 200);
    assert.equal(bad.data.correct, false);
    const retry = await call(scene(4) + "/attempts", "POST", token, { requestId: badId, answer: 4 });
    assert.equal(retry.status, 200);
    assert.equal(retry.data.state.summary.attempts, 2);
    assert.equal((await call(scene(4) + "/attempts", "POST", token, { requestId: badId, answer: 5 })).status, 409);
    assert.equal((await call(scene(4) + "/advance", "POST", token)).status, 409);
    assert.equal((await call(scene(4) + "/explanation", "POST", token)).data.state.summary.explanations, 1);
    const good = await call(scene(4) + "/attempts", "POST", token, { requestId: randomUUID(), answer: 5 });
    assert.equal(good.data.correct, true);
    assert.equal(good.data.state.summary.independent, 1); // Drag was independent; corrected choice wasn't.
    const fresh = await call("/learning/state", "GET", token);
    assert.equal(fresh.data.progress.scenes[3].solved, true);
    assert.equal(fresh.data.summary.hints, 1);
    assert.equal((await call("/learning/state", "GET", two.data.token)).data.progress.currentSceneIndex, 0);
    assert.equal((await call(scene(4) + "/advance", "POST", token)).status, 200);
    assert.equal((await call(scene(5) + "/advance", "POST", token)).status, 409);
    const concurrentId = randomUUID();
    const concurrent = await Promise.all([
      call(scene(5) + "/attempts", "POST", token, { requestId: concurrentId, answer: 7 }),
      call(scene(5) + "/attempts", "POST", token, { requestId: concurrentId, answer: 7 }),
    ]);
    assert.deepEqual(concurrent.map(r => r.status), [200, 200]);
    assert.equal((await call("/learning/state", "GET", token)).data.summary.attempts, 4);
    const complete = await call(scene(5) + "/advance", "POST", token);
    assert.equal(complete.data.state.progress.lessonCompleted, true);
    assert.equal(complete.data.state.progress.currentSceneIndex, 5);
    assert.equal(complete.data.state.progress.completedSceneIds.length, 5);
    assert.ok(complete.data.state.progress.completedAt);
    assert.equal((await call(scene(1) + "/advance", "POST", token)).data.state.progress.currentSceneIndex, 5);
    assert.equal((await call(scene(100) + "/advance", "POST", token)).status, 404);
    assert.equal((await call(scene(4) + "/progress", "PATCH", token, { positionPercent: 9, movedCount: 2 })).status, 400);
});