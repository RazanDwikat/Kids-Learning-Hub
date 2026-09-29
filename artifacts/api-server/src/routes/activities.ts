import { createHash, randomUUID } from "node:crypto";
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db, activities, activityQuestions, activityRuns, activityAttempts, learningSessions,
  learningChildren, learningEnrollments, learningAttempts, learningProgress, learningScenes,
} from "@workspace/db";
import {
  GetActivityCatalogResponse, StartActivityRunParams, StartActivityRunBody, StartActivityRunResponse,
  GetActivityRunParams, GetActivityRunResponse, SubmitActivityAttemptParams, SubmitActivityAttemptBody,
  SubmitActivityAttemptResponse, GetChildDashboardResponse,
} from "@workspace/api-zod";
import { additionCatalog, ADDITION_LESSON_ID } from "../lib/learning-curriculum";
import { ensureActivitiesReady } from "../lib/activity-seed";

const router: IRouter = Router();
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const fail = (status: number, message: string): never => { throw new HttpError(status, message); };
const child = (res: Response) => res.locals.childId as string;

router.use(["/activities", "/dashboard"], async (req, res, next): Promise<void> => {
  await ensureActivitiesReady();
  const auth = req.headers.authorization;
  if (!auth || !/^Bearer [A-Za-z0-9_-]{43}$/.test(auth)) throw new HttpError(401, "Bearer token required");
  const hash = createHash("sha256").update(auth.slice(7)).digest("hex");
  const [session] = await db.select().from(learningSessions).where(eq(learningSessions.tokenHash, hash));
  if (!session) fail(401, "Invalid session");
  res.locals.childId = session.childId;
  next();
});

async function catalog(childId: string, tx: Tx | typeof db = db) {
  const rows = await tx.select().from(activities).orderBy(asc(activities.id));
  const runs = await tx.select().from(activityRuns).where(eq(activityRuns.childId, childId)).orderBy(desc(activityRuns.createdAt), desc(activityRuns.id));
  const questions = await tx.select().from(activityQuestions);
  return rows.map(a => {
    const own = runs.filter(r => r.activityId === a.id);
    const completed = own.filter(r => r.completedAt !== null);
    return {
      id: a.id, title: a.title, kind: a.kind, lessonId: a.lessonId,
      questionCount: questions.filter(q => q.activityId === a.id).length,
      completedRuns: completed.length,
      activeRunId: own.find(r => r.completedAt === null)?.id ?? null,
      bestScore: completed.length ? Math.max(...completed.map(r => r.correctCount)) : null,
    };
  });
}

async function ownedRun(runId: string, childId: string, tx: Tx | typeof db = db) {
  const [run] = await tx.select().from(activityRuns).where(and(eq(activityRuns.id, runId), eq(activityRuns.childId, childId)));
  if (!run) fail(404, "Run not found");
  return run;
}
async function presentRun(run: typeof activityRuns.$inferSelect, tx: Tx | typeof db = db) {
  const [activity] = await tx.select().from(activities).where(eq(activities.id, run.activityId));
  if (!activity) fail(404, "Activity not found");
  const questions = await tx.select().from(activityQuestions).where(eq(activityQuestions.activityId, run.activityId)).orderBy(asc(activityQuestions.index));
  const [last] = await tx.select().from(activityAttempts).where(eq(activityAttempts.runId, run.id)).orderBy(desc(activityAttempts.createdAt), desc(activityAttempts.id)).limit(1);
  return {
    id: run.id, activityId: run.activityId, kind: activity.kind, title: activity.title,
    currentIndex: run.currentIndex, total: questions.length, correctCount: run.correctCount,
    completedAt: run.completedAt,
    questions: questions.map(({ id, type, prompt, options, tokens, left, right, concept }) => ({ id, type, prompt, options, tokens, left, right, concept })),
    lastFeedback: last ? { questionId: last.questionId, correct: last.correct, feedback: last.feedback, answer: last.answer } : null,
  };
}

router.get("/activities", async (_req, res): Promise<void> => {
  res.json(GetActivityCatalogResponse.parse(await catalog(child(res))));
});
router.post("/activities/:activityId/runs", async (req, res): Promise<void> => {
  const params = StartActivityRunParams.safeParse(req.params);
  const body = StartActivityRunBody.safeParse(req.body);
  if (!params.success || !body.success || Object.keys(req.body).some(k => !["requestId", "restart"].includes(k))) throw new HttpError(400, "Invalid run request");
  const { activityId } = params.data;
  const { requestId, restart } = body.data;
  const id = child(res);
  const result = await db.transaction(async tx => {
    // Lock child to serialize starts for the same account/activity, including concurrent
    // requests carrying different request IDs. Never lock a run before checking ownership.
    await tx.execute(sql`SELECT id FROM learning_children WHERE id = ${id} FOR UPDATE`);
    const [activity] = await tx.select().from(activities).where(eq(activities.id, activityId));
    if (!activity) fail(404, "Activity not found");
    const [retry] = await tx.select().from(activityRuns).where(and(eq(activityRuns.childId, id), eq(activityRuns.requestId, requestId)));
    if (retry) {
      if (retry.activityId !== activity.id) fail(409, "Request ID already used for another activity");
      return presentRun(retry, tx);
    }
    const [latest] = await tx.select().from(activityRuns)
      .where(and(eq(activityRuns.childId, id), eq(activityRuns.activityId, activity.id)))
      .orderBy(desc(activityRuns.createdAt), desc(activityRuns.id)).limit(1);
    if (latest && !latest.completedAt) {
      if (restart) fail(409, "Finish the active run before restarting");
      return presentRun(latest, tx);
    }
    if (latest?.completedAt && !restart) fail(409, "Run complete; set restart true to try again");
    const [created] = await tx.insert(activityRuns).values({ id: randomUUID(), childId: id, activityId: activity.id, requestId }).returning();
    return presentRun(created, tx);
  });
  res.json(StartActivityRunResponse.parse(result));
});
router.get("/activities/runs/:runId", async (req, res): Promise<void> => {
  const params = GetActivityRunParams.safeParse(req.params);
  if (!params.success) throw new HttpError(400, "Invalid run ID");
  res.json(GetActivityRunResponse.parse(await presentRun(await ownedRun(params.data.runId, child(res)))));
});

type Answer = { value?: string; items?: string[]; pairs?: { left: string; right: string }[] };
function checkAnswer(q: typeof activityQuestions.$inferSelect, answer: Answer): boolean {
  const keys = Object.keys(answer);
  const expected = q.answer as Answer;
  if (q.type === "choice" || q.type === "counting" || q.type === "direct") {
    if (keys.length !== 1 || typeof answer.value !== "string" || !/^\d{1,2}$/.test(answer.value)) throw new HttpError(400, "Expected a number answer");
    if (q.type === "choice" && !q.options.includes(answer.value)) throw new HttpError(400, "Answer must be an option");
    return answer.value === expected.value;
  }
  if (q.type === "drag") {
    if (keys.length !== 1 || !answer.items || answer.items.length !== q.tokens.length ||
      [...answer.items].sort().join("\0") !== [...q.tokens].sort().join("\0")) throw new HttpError(400, "Expected an ordering of the provided tokens");
    return answer.items.every((item, index) => item === expected.items?.[index]);
  }
  if (q.type === "matching") {
    if (keys.length !== 1 || !answer.pairs || answer.pairs.length !== q.left.length ||
      new Set(answer.pairs.map(p => p.left)).size !== q.left.length ||
      new Set(answer.pairs.map(p => p.right)).size !== q.right.length ||
      answer.pairs.some(p => !q.left.includes(p.left) || !q.right.includes(p.right))) throw new HttpError(400, "Expected each provided item matched once");
    return answer.pairs.every(p => expected.pairs?.some(e => e.left === p.left && e.right === p.right));
  }
  throw new HttpError(500, "Unsupported question type");
}
router.post("/activities/runs/:runId/attempts", async (req, res): Promise<void> => {
  const params = SubmitActivityAttemptParams.safeParse(req.params);
  const body = SubmitActivityAttemptBody.safeParse(req.body);
  if (!params.success || !body.success || Object.keys(req.body).some(k => !["requestId", "questionId", "answer"].includes(k)) ||
    Object.keys(body.data.answer).some(k => !["value", "items", "pairs"].includes(k))) throw new HttpError(400, "Invalid attempt");
  const { runId } = params.data;
  const { requestId, questionId, answer } = body.data;
  const id = child(res);
  const result = await db.transaction(async tx => {
    // One row lock serializes retries and completion; ownership is checked first.
    const run = await ownedRun(runId, id, tx);
    await tx.execute(sql`SELECT id FROM activity_runs WHERE id = ${run.id} FOR UPDATE`);
    const [retry] = await tx.select().from(activityAttempts).where(and(eq(activityAttempts.childId, id), eq(activityAttempts.requestId, requestId)));
    if (retry) {
      if (retry.runId !== run.id || retry.questionId !== questionId || JSON.stringify(retry.answer) !== JSON.stringify(answer))
        fail(409, "Request ID already used for another answer");
      return { correct: retry.correct, feedback: retry.feedback, run: await presentRun(await ownedRun(run.id, id, tx), tx) };
    }
    if (run.completedAt) fail(409, "Run complete");
    const [q] = await tx.select().from(activityQuestions).where(and(eq(activityQuestions.activityId, run.activityId), eq(activityQuestions.index, run.currentIndex)));
    if (!q || q.id !== questionId) throw new HttpError(409, "Submit the current question");
    const correct = checkAnswer(q, answer);
    const feedback = correct ? "Wonderful! You got it!" : "Not quite. Try counting the groups again!";
    await tx.insert(activityAttempts).values({
      id: randomUUID(), childId: id, runId: run.id, questionId: q.id, requestId,
      answer, correct, feedback,
    });
    // Homework and practice allow retries. Exam is scored, so every submitted
    // answer consumes one question. Completion and reward derive from this update.
    if (correct || (await tx.select({ kind: activities.kind }).from(activities).where(eq(activities.id, run.activityId)))[0]?.kind === "exam") {
      const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(activityQuestions).where(eq(activityQuestions.activityId, run.activityId));
      await tx.update(activityRuns).set({
        currentIndex: run.currentIndex + 1,
        correctCount: run.correctCount + Number(correct),
        ...(run.currentIndex + 1 === count ? { completedAt: new Date() } : {}),
      }).where(eq(activityRuns.id, run.id));
    }
    return { correct, feedback, run: await presentRun(await ownedRun(run.id, id, tx), tx) };
  });
  res.json(SubmitActivityAttemptResponse.parse(result));
});

router.get("/dashboard", async (_req, res): Promise<void> => {
  const id = child(res);
  const [profile] = await db.select().from(learningChildren).where(eq(learningChildren.id, id));
  if (!profile) fail(401, "Invalid session");
  const { lesson, subject, grade } = await additionCatalog();
  const [enrollment] = await db.select().from(learningEnrollments).where(and(eq(learningEnrollments.childId, id), eq(learningEnrollments.lessonId, lesson.id)));
  if (!enrollment) fail(409, "Lesson enrollment missing");
  const scenes = await db.select().from(learningScenes).where(eq(learningScenes.lessonId, lesson.id));
  const sceneIds = scenes.map(s => s.id);
  const sceneAttempts = await db.select().from(learningAttempts).where(and(eq(learningAttempts.childId, id), inArray(learningAttempts.sceneId, sceneIds)));
  const sceneProgress = await db.select().from(learningProgress).where(and(eq(learningProgress.childId, id), inArray(learningProgress.sceneId, sceneIds)));
  const attempts = await db.select().from(activityAttempts).where(eq(activityAttempts.childId, id));
  const runs = await db.select().from(activityRuns).where(eq(activityRuns.childId, id));
  const questions = await db.select().from(activityQuestions);
  const concept = new Map<string, { correct: number; total: number }>();
  for (const a of sceneAttempts) {
    const tally = concept.get("Addition") ?? { correct: 0, total: 0 };
    tally.total++; if (a.correct) tally.correct++;
    concept.set("Addition", tally);
  }
  for (const a of attempts) {
    const q = questions.find(q => q.id === a.questionId);
    if (!q) continue;
    const tally = concept.get(q.concept) ?? { correct: 0, total: 0 };
    tally.total++; if (a.correct) tally.correct++;
    concept.set(q.concept, tally);
  }
  const dates = new Set([...attempts.map(a => a.createdAt), ...sceneAttempts.map(a => a.createdAt),
    ...sceneProgress.flatMap(p => p.completedAt ? [p.completedAt] : []), ...runs.flatMap(r => r.completedAt ? [r.completedAt] : [])]
    .map(d => d.toISOString().slice(0, 10)));
  const today = new Date().toISOString().slice(0, 10);
  let streakDays = 0;
  const day = new Date(`${today}T00:00:00Z`);
  if (!dates.has(today)) day.setUTCDate(day.getUTCDate() - 1);
  while (dates.has(day.toISOString().slice(0, 10))) { streakDays++; day.setUTCDate(day.getUTCDate() - 1); }
  res.json(GetChildDashboardResponse.parse({
    child: { id, name: profile.name }, grade: grade.title, subject: subject.title,
    lesson: { id: lesson.id, title: lesson.title, currentSceneIndex: enrollment.currentSceneIndex, totalScenes: scenes.length, completed: !!enrollment.completedAt },
    todayActivity: attempts.filter(a => a.createdAt.toISOString().slice(0, 10) === today).length +
      sceneAttempts.filter(a => a.createdAt.toISOString().slice(0, 10) === today).length +
      sceneProgress.filter(p => p.completedAt?.toISOString().slice(0, 10) === today).length,
    lessonsCompleted: Number(!!enrollment.completedAt),
    activities: await catalog(id),
    totalCorrect: attempts.filter(a => a.correct).length + sceneAttempts.filter(a => a.correct).length,
    totalAttempts: attempts.length + sceneAttempts.length,
    strengths: [...concept].filter(([, t]) => t.correct > 0 && t.correct / t.total >= 0.8).map(([name]) => name),
    needsPractice: [...concept].filter(([, t]) => t.correct / t.total < 0.8).map(([name]) => name),
    streakDays, rewards: runs.filter(r => r.completedAt).length,
  }));
});

router.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) { res.status(err.status).json({ error: err.message }); return; }
  req.log.error({ errorType: err instanceof Error ? err.name : "Unknown" }, "Activity request failed");
  res.status(500).json({ error: "Internal server error" });
});
export default router;