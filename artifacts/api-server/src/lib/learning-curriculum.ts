import { db, learningGrades, learningLessons, learningScenes, learningSubjects } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export const ADDITION_LESSON_ID = "addition";
export const curriculum = [
  { id: "addition-1", index: 0, title: "A little apple story", caption: "Bunny has 2 apples. Mama brings 2 more!", color: "#dceee3", type: "video", durationMs: 12500, a: 2, b: 2, options: [], questionId: null, answer: null },
  { id: "addition-2", index: 1, title: "Put them together!", caption: "Addition makes one big group.", color: "#f9e8d4", type: "video", durationMs: 12500, a: 2, b: 2, options: [], questionId: null, answer: null },
  { id: "addition-3", index: 2, title: "Your turn to help", caption: "Move the apples over to Bunny.", color: "#eae2f2", type: "drag", durationMs: null, a: 2, b: 2, options: [], questionId: null, answer: null },
  { id: "addition-4", index: 3, title: "Count with Bunny", caption: "How many apples altogether?", color: "#fff0c9", type: "choice", durationMs: null, a: 3, b: 2, options: [4, 5, 6], questionId: "addition-q4", answer: 5 },
  { id: "addition-5", index: 4, title: "Bunny’s big challenge", caption: "One last little puzzle!", color: "#d5eddf", type: "choice", durationMs: null, a: 4, b: 3, options: [6, 7, 8], questionId: "addition-q5", answer: 7 },
] as const;

// Data-only seed: schema changes are applied by the managed migration flow.
// A rejected seed is awaited by its caller and retried on the next request.
let seedPromise: Promise<void> | undefined;
export function ensureLearningReady(): Promise<void> {
  seedPromise ??= db.transaction(async tx => {
    await tx.insert(learningGrades).values({ id: "grade-1", title: "Grade 1" }).onConflictDoNothing();
    await tx.insert(learningSubjects).values({ id: "math", gradeId: "grade-1", title: "Math" }).onConflictDoNothing();
    await tx.insert(learningLessons).values({ id: ADDITION_LESSON_ID, subjectId: "math", title: "Putting groups together" }).onConflictDoNothing();
    for (const scene of curriculum) {
      await tx.insert(learningScenes).values({ ...scene, lessonId: ADDITION_LESSON_ID, options: [...scene.options] })
        .onConflictDoUpdate({ target: learningScenes.id, set: { lessonId: ADDITION_LESSON_ID } });
    }
    // Old child rows predate enrollment; preserve their completed work. New
    // children always receive enrollment in the session creation transaction.
    await tx.execute(sql`
      INSERT INTO learning_enrollments (child_id, lesson_id, current_scene_index, completed_at)
      SELECT id, ${ADDITION_LESSON_ID}, current_scene_index, completed_at FROM learning_children
      ON CONFLICT (child_id, lesson_id) DO NOTHING
    `);
  }).then(() => undefined).catch(error => {
    seedPromise = undefined;
    throw error;
  });
  return seedPromise;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function additionCatalog(tx: Tx | typeof db = db) {
  const [lesson] = await tx.select().from(learningLessons).where(eq(learningLessons.id, ADDITION_LESSON_ID));
  if (!lesson) throw new Error("Addition lesson is missing");
  const [subject] = await tx.select().from(learningSubjects).where(eq(learningSubjects.id, lesson.subjectId));
  if (!subject) throw new Error("Math subject is missing");
  const [grade] = await tx.select().from(learningGrades).where(eq(learningGrades.id, subject.gradeId));
  if (!grade) throw new Error("Grade 1 is missing");
  return { lesson, subject, grade };
}