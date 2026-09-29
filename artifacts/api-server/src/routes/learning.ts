import { randomBytes, randomUUID, createHash } from "node:crypto";
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  db, learningScenes, learningChildren, learningEnrollments, learningSessions, learningProgress,
  learningAttempts, learningExplanations,
} from "@workspace/db";
import { ADDITION_LESSON_ID, additionCatalog, curriculum, ensureLearningReady } from "../lib/learning-curriculum";
import {
  CreateLearningSessionResponse, GetLearningStateResponse, UpdateLearningSceneProgressBody,
  UpdateLearningSceneProgressParams, UpdateLearningSceneProgressResponse,
  SubmitLearningSceneAttemptBody, SubmitLearningSceneAttemptParams, SubmitLearningSceneAttemptResponse,
  AdvanceLearningSceneParams, AdvanceLearningSceneResponse,
  RecordLearningSceneExplanationParams, RecordLearningSceneExplanationResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const fail = (status: number, message: string): never => { throw new HttpError(status, message); };
const sceneFor = async (sceneId: string) => {
  const [scene] = await db.select().from(learningScenes).where(and(eq(learningScenes.id, sceneId), eq(learningScenes.lessonId, ADDITION_LESSON_ID)));
  if (!scene) fail(404, "Scene not found");
  return scene;
};
async function state(childId: string, tx: Tx | typeof db = db) {
  const [child] = await tx.select().from(learningChildren).where(eq(learningChildren.id, childId));
  if (!child) fail(401, "Invalid session");
  const [enrollment] = await tx.select().from(learningEnrollments).where(and(eq(learningEnrollments.childId, childId), eq(learningEnrollments.lessonId, ADDITION_LESSON_ID)));
  if (!enrollment) fail(409, "Lesson enrollment missing");
  const { grade, subject, lesson } = await additionCatalog(tx);
  const scenes = await tx.select().from(learningScenes).where(eq(learningScenes.lessonId, lesson.id)).orderBy(asc(learningScenes.index));
  const sceneIds = scenes.map(s => s.id);
  const progress = await tx.select().from(learningProgress).where(and(eq(learningProgress.childId, childId), inArray(learningProgress.sceneId, sceneIds)));
  const attempts = await tx.select().from(learningAttempts).where(and(eq(learningAttempts.childId, childId), inArray(learningAttempts.sceneId, sceneIds)));
  const explanations = await tx.select().from(learningExplanations).where(and(eq(learningExplanations.childId, childId), inArray(learningExplanations.sceneId, sceneIds)));
  return {
    child: { id: child.id, name: child.name },
    grade: { id: grade.id, title: grade.title },
    subject: { id: subject.id, title: subject.title },
    lesson: { id: lesson.id, title: lesson.title, scenes: scenes.map(s => ({
      id: s.id, index: s.index, title: s.title, caption: s.caption, color: s.color,
      type: s.type, durationMs: s.durationMs, operands: { a: s.a, b: s.b },
      options: s.options, questionId: s.questionId,
    })) },
    progress: {
      currentSceneIndex: enrollment.currentSceneIndex,
      completedSceneIds: scenes.filter(s => progress.some(p => p.sceneId === s.id && p.completedAt)).map(s => s.id),
      scenes: scenes.map(s => {
        const p = progress.find(p => p.sceneId === s.id);
        return { sceneId: s.id, positionPercent: p?.positionPercent ?? 0, movedCount: p?.movedCount ?? 0, solved: p?.solved ?? false };
      }),
      lessonCompleted: enrollment.completedAt !== null,
      completedAt: enrollment.completedAt,
    },
    summary: {
      attempts: attempts.length,
      independent: attempts.filter(a => a.independent).length,
      hints: attempts.filter(a => !a.correct).length,
      explanations: explanations.length,
    },
  };
}

// Lock the enrollment row, not the child, so another lesson can progress
// independently while retries for this child's addition lesson serialize.
async function locked<T>(childId: string, fn: (tx: Tx, enrollment: typeof learningEnrollments.$inferSelect) => Promise<T>) {
  return db.transaction(async tx => {
    await tx.execute(sql`SELECT child_id FROM learning_enrollments WHERE child_id = ${childId} AND lesson_id = ${ADDITION_LESSON_ID} FOR UPDATE`);
    const [enrollment] = await tx.select().from(learningEnrollments).where(and(eq(learningEnrollments.childId, childId), eq(learningEnrollments.lessonId, ADDITION_LESSON_ID)));
    if (!enrollment) fail(409, "Lesson enrollment missing");
    return fn(tx, enrollment);
  });
}
const validateScene = (enrollment: typeof learningEnrollments.$inferSelect, scene: typeof learningScenes.$inferSelect) => {
  if (scene.index > enrollment.currentSceneIndex) fail(409, "Complete previous scene first");
};
const buckets = new Map<string, { start: number, count: number }>();
function limit(key: string, max: number) {
  const now = Date.now();
  if (buckets.size > 10000) for (const [k, v] of buckets) if (now - v.start > 60_000) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || now - b.start > 60_000) { buckets.set(key, { start: now, count: 1 }); return; }
  if (++b.count > max) fail(429, "Too many requests");
}

function handleError(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) { res.status(err.status).json({ error: err.message }); return; }
  // Do not log request headers/body or exception objects that might contain
  // credentials or user input; the request logger supplies the request ID.
  req.log.error({ errorType: err instanceof Error ? err.name : "Unknown" }, "Learning request failed");
  res.status(500).json({ error: "Internal server error" });
}
router.post("/learning/session", async (req, res): Promise<void> => {
  await ensureLearningReady();
  limit(`new:${req.ip}`, 12);
  const token = randomBytes(32).toString("base64url");
  const id = randomUUID();
  await db.transaction(async tx => {
    await tx.insert(learningChildren).values({ id, name: "Sam" });
    await tx.insert(learningEnrollments).values({ childId: id, lessonId: ADDITION_LESSON_ID });
    await tx.insert(learningSessions).values({ id: randomUUID(), childId: id, tokenHash: hash(token) });
    await tx.insert(learningProgress).values(curriculum.map(s => ({ childId: id, sceneId: s.id })));
  });
  res.status(201).json(CreateLearningSessionResponse.parse({ token, state: await state(id) }));
});
router.use("/learning", async (req, res, next): Promise<void> => {
  await ensureLearningReady();
  const authorization = req.headers.authorization;
  if (!authorization || !/^Bearer [A-Za-z0-9_-]{43}$/.test(authorization)) throw new HttpError(401, "Bearer token required");
  const [session] = await db.select().from(learningSessions).where(eq(learningSessions.tokenHash, hash(authorization.slice(7))));
  if (!session) fail(401, "Invalid session");
  limit(`child:${session.childId}`, 180);
  res.locals.childId = session.childId;
  next();
});
router.get("/learning/state", async (_req, res): Promise<void> => {
  res.json(GetLearningStateResponse.parse(await state(res.locals.childId)));
});
router.patch("/learning/scenes/:sceneId/progress", async (req, res): Promise<void> => {
  const params = UpdateLearningSceneProgressParams.safeParse(req.params);
  const body = UpdateLearningSceneProgressBody.safeParse(req.body);
  if (!params.success || !body.success) throw new HttpError(400, "Invalid progress");
  const scene = await sceneFor(params.data.sceneId);
  if ((body.data.movedCount !== undefined && scene.type !== "drag") ||
      (scene.type === "drag" && body.data.movedCount === undefined)) fail(400, "Invalid scene progress");
  const childId = res.locals.childId as string;
  const result = await locked(childId, async (tx, enrollment) => {
    validateScene(enrollment, scene);
    const [old] = await tx.select().from(learningProgress).where(and(eq(learningProgress.childId, childId), eq(learningProgress.sceneId, scene.id)));
    if (!old) fail(409, "Scene progress missing");
    if (body.data.positionPercent < old.positionPercent || (body.data.movedCount ?? 0) < old.movedCount) fail(409, "Progress cannot decrease");
    if (scene.index === enrollment.currentSceneIndex) {
      const moved = body.data.movedCount ?? old.movedCount;
      await tx.update(learningProgress).set({
        positionPercent: body.data.positionPercent, movedCount: moved, solved: old.solved || (scene.type === "drag" && moved === 2),
      }).where(and(eq(learningProgress.childId, childId), eq(learningProgress.sceneId, scene.id)));
      if (scene.type === "drag" && moved === 2 && !old.solved) {
        const help = await tx.select().from(learningExplanations).where(and(eq(learningExplanations.childId, childId), eq(learningExplanations.sceneId, scene.id)));
        await tx.insert(learningAttempts).values({ id: randomUUID(), childId, sceneId: scene.id, correct: true, independent: help.length === 0, feedback: "Wonderful! 2 + 2 = 4" });
      }
    }
    return state(childId, tx);
  });
  res.json(UpdateLearningSceneProgressResponse.parse({ state: result }));
});
router.post("/learning/scenes/:sceneId/attempts", async (req, res): Promise<void> => {
  const params = SubmitLearningSceneAttemptParams.safeParse(req.params);
  const body = SubmitLearningSceneAttemptBody.safeParse(req.body);
  if (!params.success || !body.success) throw new HttpError(400, "Invalid attempt");
  const scene = await sceneFor(params.data.sceneId);
  if (scene.type !== "choice" || !scene.options.includes(body.data.answer)) fail(400, "Answer must be a scene option");
  const childId = res.locals.childId as string;
  const result = await locked(childId, async (tx, enrollment) => {
    const [retry] = await tx.select().from(learningAttempts).where(and(eq(learningAttempts.childId, childId), eq(learningAttempts.requestId, body.data.requestId)));
    if (retry) {
      if (retry.sceneId !== scene.id || retry.answer !== body.data.answer) fail(409, "Request ID already used for another answer");
      return { correct: retry.correct, feedback: retry.feedback, state: await state(childId, tx) };
    }
    validateScene(enrollment, scene);
    if (enrollment.currentSceneIndex !== scene.index) fail(409, "Scene already completed");
    const [old] = await tx.select().from(learningProgress).where(and(eq(learningProgress.childId, childId), eq(learningProgress.sceneId, scene.id)));
    if (!old || old.solved) fail(409, "Scene already solved");
    const prior = await tx.select().from(learningAttempts).where(and(eq(learningAttempts.childId, childId), eq(learningAttempts.sceneId, scene.id)));
    const help = await tx.select().from(learningExplanations).where(and(eq(learningExplanations.childId, childId), eq(learningExplanations.sceneId, scene.id)));
    const correct = body.data.answer === scene.answer;
    const feedback = correct ? "Wonderful! You got it!" : "Almost! Let's count together.";
    await tx.insert(learningAttempts).values({
      id: randomUUID(), childId, sceneId: scene.id, requestId: body.data.requestId,
      answer: body.data.answer, correct, independent: correct && prior.length === 0 && help.length === 0, feedback,
    });
    if (correct) await tx.update(learningProgress).set({ solved: true }).where(and(eq(learningProgress.childId, childId), eq(learningProgress.sceneId, scene.id)));
    return { correct, feedback, state: await state(childId, tx) };
  });
  res.json(SubmitLearningSceneAttemptResponse.parse(result));
});
router.post("/learning/scenes/:sceneId/advance", async (req, res): Promise<void> => {
  const params = AdvanceLearningSceneParams.safeParse(req.params);
  if (!params.success) throw new HttpError(400, "Invalid scene");
  const scene = await sceneFor(params.data.sceneId);
  const childId = res.locals.childId as string;
  const result = await locked(childId, async (tx, enrollment) => {
    validateScene(enrollment, scene);
    if (scene.index === enrollment.currentSceneIndex) {
      const [progress] = await tx.select().from(learningProgress).where(and(eq(learningProgress.childId, childId), eq(learningProgress.sceneId, scene.id)));
      if (!progress || (scene.type !== "video" && !progress.solved)) fail(409, "Finish activity before advancing");
      await tx.update(learningProgress).set({ completedAt: new Date() }).where(and(eq(learningProgress.childId, childId), eq(learningProgress.sceneId, scene.id)));
      await tx.update(learningEnrollments).set({
        currentSceneIndex: scene.index + 1,
        ...(scene.index === 4 ? { completedAt: new Date() } : {}),
      }).where(and(eq(learningEnrollments.childId, childId), eq(learningEnrollments.lessonId, ADDITION_LESSON_ID)));
    }
    return state(childId, tx);
  });
  res.json(AdvanceLearningSceneResponse.parse({ state: result }));
});
router.post("/learning/scenes/:sceneId/explanation", async (req, res): Promise<void> => {
  const params = RecordLearningSceneExplanationParams.safeParse(req.params);
  if (!params.success) throw new HttpError(400, "Invalid scene");
  const scene = await sceneFor(params.data.sceneId);
  const childId = res.locals.childId as string;
  const result = await locked(childId, async (tx, enrollment) => {
    validateScene(enrollment, scene);
    if (scene.index !== enrollment.currentSceneIndex) fail(409, "Scene already completed");
    await tx.insert(learningExplanations).values({ id: randomUUID(), childId, sceneId: scene.id });
    return state(childId, tx);
  });
  res.json(RecordLearningSceneExplanationResponse.parse({ state: result }));
});
router.use(handleError);

export default router;