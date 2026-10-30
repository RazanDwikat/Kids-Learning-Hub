import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

async function call(path, method = "GET", token, body) {
  const response = await fetch(`http://localhost:80/api${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json() };
}

test("printed textbook exercises are exact, numbered, and not worked examples", async () => {
  const { data: session } = await call("/learning/session", "POST");
  const token = session.token;
  const books = await call("/textbooks", "GET", token);
  assert.equal(books.status, 200);
  assert.deepEqual(books.data.map(b => [b.grade, b.subject, b.title]), [["Grade 1", "Math", "Grade 1 Math Example Book"]]);
  const prefix = `/textbooks/${books.data[0].id}/pages`;
  const pages = await call(prefix, "GET", token);
  assert.deepEqual(pages.data.map(p => [p.number, p.exerciseCount]), [[2, 0], [3, 0], [4, 4], [5, 10], [6, 0], [7, 10], [8, 3], [9, 0]]);
  assert.equal((await call(`${prefix}/3/runs`, "POST", token, { requestId: randomUUID() })).status, 400);
  const known = [
    [4, ["1 + 2 = ____", "2 + 3 = ____", "4 + 1 = ____", "3 + 3 = ____"]],
    [5, ["1 + 2 = ____", "2 + 3 = ____", "4 + 1 = ____", "3 + 3 = ____", "5 + 2 = ____", "6 + 1 = ____", "4 + 4 = ____", "2 + 7 = ____", "5 + 5 = ____", "3 + 6 = ____"]],
    [7, ["4 - 1 = ____", "5 - 3 = ____", "6 - 2 = ____", "7 - 4 = ____", "8 - 3 = ____", "9 - 5 = ____", "10 - 4 = ____", "6 - 6 = ____", "8 - 2 = ____", "9 - 3 = ____"]],
    [8, ["A ball is a ______________ shape.", "A door is a ______________ shape.", "A pizza slice is a ______________ shape."]],
  ];
  const answerKeys = {
    4: ["3", "5", "5", "6"],
    5: ["3", "5", "5", "6", "7", "7", "8", "9", "10", "9"],
    7: ["3", "2", "4", "3", "5", "4", "6", "0", "6", "6"],
    8: ["circle", "rectangle", "triangle"],
  };
  for (const [page, prompts] of known) {
    const path = `${prefix}/${page}/runs`;
    const run = await call(path, "POST", token, { requestId: randomUUID() });
    assert.equal(run.status, 200);
    assert.equal(run.data.source.pageNumber, page);
    assert.deepEqual(run.data.questions.map(q => q.prompt), prompts);
    assert.deepEqual(run.data.questions.map(q => q.number), prompts.map((_, i) => i + 1));
    assert.ok(run.data.questions.every(q => !("answer" in q)));
    assert.equal((await call(path, "POST", token, { requestId: randomUUID() })).data.id, run.data.id);
    for (const [index, value] of answerKeys[page].entries()) {
      const attempt = await call(`/activities/runs/${run.data.id}/attempts`, "POST", token,
        { requestId: randomUUID(), questionId: run.data.questions[index].id, answer: { value } });
      assert.equal(attempt.status, 200);
      assert.equal(attempt.data.correct, true);
      assert.equal(attempt.data.run.currentIndex, index + 1);
    }
  }
});

test("exam retries, ordering, saved parent reward, and once-only completion", async () => {
  const { data: session } = await call("/learning/session", "POST");
  const token = session.token;
  assert.equal((await call("/reward-config", "GET", token)).data.enabled, false);
  const config = { enabled: true, category: "activity", title: "Choose a game", message: "Ask your grown-up to choose a game together." };
  assert.deepEqual((await call("/reward-config", "PUT", token, config)).data, config);
  assert.deepEqual((await call("/reward-config", "GET", token)).data, config);
  const run = (await call("/activities/addition-adventure-v2/runs", "POST", token, { requestId: randomUUID() })).data;
  assert.deepEqual(run.questions.map(q => q.type), ["choice", "drag", "matching", "counting", "direct", "ordering"]);
  const path = `/activities/runs/${run.id}/attempts`;
  const badId = randomUUID();
  const bad = await call(path, "POST", token, { requestId: badId, questionId: run.questions[0].id, answer: { value: "4" } });
  assert.equal(bad.data.correct, false);
  assert.equal(bad.data.run.currentIndex, 0);
  assert.match(bad.data.feedback, /try again/i);
  assert.equal((await call(path, "POST", token, { requestId: badId, questionId: run.questions[0].id, answer: { value: "4" } })).data.run.attemptCount, 1);
  assert.equal((await call(path, "POST", token, { requestId: randomUUID(), questionId: run.questions[1].id, answer: { items: ["2", "+", "2", "=", "4"] } })).status, 409);
  const answers = [
    { value: "5" }, { items: ["2", "+", "2", "=", "4"] },
    { pairs: [{ left: "1 + 2", right: "3" }, { left: "2 + 2", right: "4" }, { left: "3 + 2", right: "5" }] },
    { value: "5" }, { value: "7" }, { items: ["1", "2", "3"] },
  ];
  for (const [i, answer] of answers.entries()) {
    const result = await call(path, "POST", token, { requestId: randomUUID(), questionId: run.questions[i].id, answer });
    assert.equal(result.status, 200);
    assert.equal(result.data.correct, true);
    assert.equal(result.data.run.currentIndex, i + 1);
    if (i === 5) {
      assert.ok(result.data.run.completedAt);
      assert.deepEqual(result.data.run.reward, config);
      assert.equal(result.data.run.attemptCount, 7);
    }
  }
  assert.equal((await call("/dashboard", "GET", token)).data.rewards, 1);
  assert.equal((await call(path, "POST", token, { requestId: randomUUID(), questionId: run.questions[5].id, answer: answers[5] })).status, 409);
  assert.equal((await call("/dashboard", "GET", token)).data.rewards, 1);
  assert.deepEqual((await call(`/activities/runs/${run.id}`, "GET", token)).data.reward, config);
});

test("photo recognition reports unavailable rather than invented questions", async () => {
  const { data: session } = await call("/learning/session", "POST");
  const status = await call("/homework/photo/status", "GET", session.token);
  assert.equal(status.data.available, false);
  assert.equal(status.data.requiresParentReview, true);
  const recognition = await call("/homework/photo/recognize", "POST", session.token);
  assert.equal(recognition.status, 503);
  assert.ok(!("questions" in recognition.data));
});