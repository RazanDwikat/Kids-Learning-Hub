import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// HTTP integration against the managed proxy; the owning agent starts the workflow.
test("child-owned activities persist every answer, deduplicate retries and award once", async () => {
  async function call(path, method = "GET", token, body) {
    const response = await fetch(`http://localhost:80/api${path}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json() };
  }
  const first = await call("/learning/session", "POST");
  const second = await call("/learning/session", "POST");
  assert.equal(first.status, 201, "start managed API workflow and push the database schema first");
  assert.equal(second.status, 201);
  const token = first.data.token;
  assert.equal((await call("/activities")).status, 401);
  const catalog = await call("/activities", "GET", token);
  assert.equal(catalog.status, 200);
  assert.ok(catalog.data.some(a => a.id === "addition-adventure-v2"));
  assert.ok(catalog.data.some(a => a.id === "grade-1-math-example-book-page-4"));
  assert.equal(catalog.data.find(a => a.kind === "homework").questionCount, 5);

  const startId = randomUUID();
  const path = "/activities/addition-homework/runs";
  const started = await call(path, "POST", token, { requestId: startId });
  assert.equal(started.status, 200);
  const run = started.data;
  assert.deepEqual(run.questions.map(q => q.type), ["choice", "drag", "matching", "counting", "direct"]);
  assert.ok(run.questions.every(q => !("answer" in q)), "public payload must not leak answer keys");
  assert.equal((await call(path, "POST", token, { requestId: startId })).data.id, run.id);
  assert.equal((await call(path, "POST", token, { requestId: randomUUID() })).data.id, run.id);
  assert.equal((await call(`/activities/runs/${run.id}`, "GET", second.data.token)).status, 404);
  assert.equal((await call(`/activities/runs/${run.id}/attempts`, "POST", second.data.token,
    { requestId: randomUUID(), questionId: run.questions[0].id, answer: { value: "5" } })).status, 404);

  const attemptPath = `/activities/runs/${run.id}/attempts`;
  const badId = randomUUID();
  const bad = await call(attemptPath, "POST", token, { requestId: badId, questionId: run.questions[0].id, answer: { value: "4" } });
  assert.equal(bad.status, 200);
  assert.equal(bad.data.correct, false);
  assert.equal(bad.data.run.currentIndex, 0);
  assert.deepEqual(bad.data.run.lastFeedback.answer, { value: "4" });
  assert.equal((await call(attemptPath, "POST", token, { requestId: badId, questionId: run.questions[0].id, answer: { value: "4" } })).status, 200);
  assert.equal((await call(attemptPath, "POST", token, { requestId: badId, questionId: run.questions[0].id, answer: { value: "5" } })).status, 409);

  const answers = [
    { value: "5" },
    { items: ["2", "+", "2", "=", "4"] },
    { pairs: [{ left: "3 + 2", right: "5" }, { left: "1 + 2", right: "3" }, { left: "2 + 2", right: "4" }] },
    { value: "5" },
    { value: "7" },
  ];
  for (const [i, answer] of answers.entries()) {
    const result = await call(attemptPath, "POST", token, { requestId: randomUUID(), questionId: run.questions[i].id, answer });
    assert.equal(result.status, 200);
    assert.equal(result.data.correct, true);
    assert.equal(result.data.run.currentIndex, i + 1);
  }
  const completed = await call(`/activities/runs/${run.id}`, "GET", token);
  assert.ok(completed.data.completedAt);
  assert.equal(completed.data.correctCount, 5);
  assert.equal((await call(path, "POST", token, { requestId: randomUUID() })).status, 409);
  assert.equal((await call(attemptPath, "POST", token,
    { requestId: randomUUID(), questionId: run.questions[4].id, answer: { value: "7" } })).status, 409);
  const dashboard = await call("/dashboard", "GET", token);
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.data.rewards, 1);
  assert.equal(dashboard.data.totalAttempts, 6);
  assert.equal(dashboard.data.activities.find(a => a.kind === "homework").completedRuns, 1);
  assert.equal((await call("/dashboard", "GET", second.data.token)).data.rewards, 0);
  const restarted = await call(path, "POST", token, { requestId: randomUUID(), restart: true });
  assert.equal(restarted.status, 200);
  assert.notEqual(restarted.data.id, run.id);

  const exam = await call("/activities/addition-exam/runs", "POST", token, { requestId: randomUUID() });
  assert.equal(exam.status, 200);
  const incorrect = await call(`/activities/runs/${exam.data.id}/attempts`, "POST", token,
    { requestId: randomUUID(), questionId: exam.data.questions[0].id, answer: { value: "4" } });
  assert.equal(incorrect.status, 200);
  assert.equal(incorrect.data.run.currentIndex, 0, "incorrect exam answer does not advance");
  assert.equal(incorrect.data.run.correctCount, 0);
});