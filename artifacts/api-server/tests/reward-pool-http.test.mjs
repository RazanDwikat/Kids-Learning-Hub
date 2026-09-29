import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

async function call(path, method = "GET", token, body) {
  const response = await fetch(`http://localhost:80/api${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: response.status === 204 ? null : await response.json() };
}
const option = (title, enabled = true) => ({ title, message: `Let's celebrate ${title} together`, enabled, category: "activity" });
async function finish(run, token, answers) {
  const path = `/activities/runs/${run.id}/attempts`;
  for (let i = 0; i < answers.length - 1; i++) {
    const result = await call(path, "POST", token, { requestId: randomUUID(), questionId: run.questions[i].id, answer: answers[i] });
    assert.equal(result.status, 200);
    assert.equal(result.data.run.currentIndex, i + 1);
  }
  const final = { questionId: run.questions.at(-1).id, answer: answers.at(-1) };
  const retryId = randomUUID();
  // Distinct final-attempt IDs race against the same row; just one may commit.
  const [a, b] = await Promise.all([
    call(path, "POST", token, { ...final, requestId: retryId }),
    call(path, "POST", token, { ...final, requestId: randomUUID() }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  const repeated = await call(path, "POST", token, { ...final, requestId: retryId });
  assert.equal(repeated.status, a.status === 200 ? 200 : 409);
  const current = await call(`/activities/runs/${run.id}`, "GET", token);
  assert.equal(current.data.attemptCount, answers.length);
  assert.ok(current.data.completedAt);
  return current.data;
}

test("reward options remain child-owned and immutable on completed homework and exams under concurrent attempts", async () => {
  const token = (await call("/learning/session", "POST")).data.token;
  const other = (await call("/learning/session", "POST")).data.token;
  assert.deepEqual((await call("/reward-options", "GET", token)).data, []);
  assert.equal((await call("/reward-options", "POST", token, option("  "))).status, 400);
  assert.equal((await call("/reward-options", "POST", token, { ...option("Fun"), message: "   " })).status, 400);
  assert.equal((await call("/reward-options", "POST", token, { ...option("Fun"), unexpected: "value" })).status, 400);
  const options = [];
  for (let n = 1; n <= 5; n++) {
    const created = await call("/reward-options", "POST", token, option(`Option ${n}`, n <= 4));
    assert.equal(created.status, 201);
    options.push(created.data);
  }
  assert.equal((await call("/reward-options", "GET", token)).data.length, 5);
  assert.deepEqual((await call("/reward-options", "GET", other)).data, []);
  assert.equal((await call(`/reward-options/${options[0].id}`, "PATCH", other, option("Intrusion"))).status, 404);
  assert.equal((await call(`/reward-options/${options[0].id}`, "DELETE", other)).status, 404);
  const exam = (await call("/activities/addition-adventure-v2/runs", "POST", token, { requestId: randomUUID() })).data;
  const examResult = await finish(exam, token, [
    { value: "5" }, { items: ["2", "+", "2", "=", "4"] },
    { pairs: [{ left: "1 + 2", right: "3" }, { left: "2 + 2", right: "4" }, { left: "3 + 2", right: "5" }] },
    { value: "5" }, { value: "7" }, { items: ["1", "2", "3"] },
  ]);
  assert.ok(options.slice(0, 4).some(o => o.title === examResult.reward?.title));
  const book = (await call("/textbooks", "GET", token)).data[0];
  const homework = (await call(`/textbooks/${book.id}/pages/4/runs`, "POST", token, { requestId: randomUUID() })).data;
  const homeworkResult = await finish(homework, token, [{ value: "3" }, { value: "5" }, { value: "5" }, { value: "6" }]);
  assert.ok(options.slice(0, 4).some(o => o.title === homeworkResult.reward?.title));
  const practice = (await call("/activities/addition-practice/runs", "POST", token, { requestId: randomUUID() })).data;
  const practiced = await finish(practice, token, [
    { value: "5" }, { items: ["2", "+", "2", "=", "4"] },
    { pairs: [{ left: "1 + 2", right: "3" }, { left: "2 + 2", right: "4" }, { left: "3 + 2", right: "5" }] },
    { value: "5" }, { value: "7" },
  ]);
  assert.equal(practiced.reward, null, "practice never draws from an enabled pool");
  const deleted = new Set();
  for (const earned of [examResult, homeworkResult]) {
    const chosen = options.find(o => o.title === earned.reward.title);
    if (!deleted.has(chosen.id)) {
      assert.equal((await call(`/reward-options/${chosen.id}`, "PATCH", token, option("Changed title"))).status, 200);
      assert.equal((await call(`/reward-options/${chosen.id}`, "DELETE", token)).status, 204);
      deleted.add(chosen.id);
    }
    assert.deepEqual((await call(`/activities/runs/${earned.id}`, "GET", token)).data.reward, earned.reward);
    assert.equal((await call(`/activities/runs/${earned.id}`, "GET", other)).status, 404);
  }
  for (const remaining of (await call("/reward-options", "GET", token)).data) {
    const { id, ...input } = remaining;
    assert.equal((await call(`/reward-options/${id}`, "PATCH", token, { ...input, enabled: false })).status, 200);
  }
  const noRewardRun = (await call(`/textbooks/${book.id}/pages/8/runs`, "POST", token, { requestId: randomUUID() })).data;
  const noReward = await finish(noRewardRun, token, [{ value: "circle" }, { value: "rectangle" }, { value: "triangle" }]);
  assert.equal(noReward.reward, null);
});

test("legacy reward config migrates only once, even after option deletion", async () => {
  const token = (await call("/learning/session", "POST")).data.token;
  const config = option("Legacy");
  assert.equal((await call("/reward-config", "PUT", token, config)).status, 200);
  const list = (await call("/reward-options", "GET", token)).data;
  assert.equal(list.length, 1);
  assert.equal(list[0].title, config.title);
  assert.equal((await call(`/reward-options/${list[0].id}`, "DELETE", token)).status, 204);
  assert.deepEqual((await call("/reward-options", "GET", token)).data, []);
});