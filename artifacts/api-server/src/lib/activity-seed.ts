import { db, activities, activityQuestions } from "@workspace/db";
import { ensureLearningReady } from "./learning-curriculum";

const templates = [
  { type: "choice", concept: "Adding groups", prompt: "2 apples and 3 apples make how many?", options: ["4", "5", "6"], tokens: [], left: [], right: [], answer: { value: "5" } },
  { type: "drag", concept: "Putting groups together", prompt: "Put the numbers in order to show 2 + 2 = 4", options: [], tokens: ["2", "+", "2", "=", "4"], left: [], right: [], answer: { items: ["2", "+", "2", "=", "4"] } },
  { type: "matching", concept: "Addition facts", prompt: "Match each addition to its sum", options: [], tokens: [], left: ["1 + 2", "2 + 2", "3 + 2"], right: ["5", "3", "4"], answer: { pairs: [{ left: "1 + 2", right: "3" }, { left: "2 + 2", right: "4" }, { left: "3 + 2", right: "5" }] } },
  { type: "counting", concept: "Counting objects", prompt: "Count all the apples: 🍎🍎 + 🍎🍎🍎", options: [], tokens: [], left: [], right: [], answer: { value: "5" } },
  { type: "direct", concept: "Addition facts", prompt: "What is 4 + 3?", options: [], tokens: [], left: [], right: [], answer: { value: "7" } },
] as const;

let pending: Promise<void> | undefined;
export function ensureActivitiesReady(): Promise<void> {
  pending ??= (async () => {
    await ensureLearningReady();
    await db.transaction(async tx => {
      for (const [id, title, kind] of [
        ["addition-homework", "Addition Homework", "homework"],
        ["addition-practice", "Addition Practice", "practice"],
        ["addition-exam", "Addition Exam", "exam"],
      ]) {
        await tx.insert(activities).values({ id, title, kind, lessonId: "addition" }).onConflictDoNothing();
        for (const [index, q] of templates.entries()) {
          await tx.insert(activityQuestions).values({
            ...q, id: `${id}-${index + 1}`, activityId: id, index,
            options: [...q.options], tokens: [...q.tokens], left: [...q.left], right: [...q.right],
            answer: q.answer,
          }).onConflictDoNothing();
        }
      }
    });
  })().catch(error => { pending = undefined; throw error; });
  return pending;
}