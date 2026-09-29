import { db, activities, activityQuestions, learningLessons } from "@workspace/db";
import { ensureLearningReady } from "./learning-curriculum";
import { pages, activityIdForPage, lessonIdForPage } from "./textbook-catalog";

const templates = [
  { type: "choice", concept: "Adding groups", prompt: "2 apples and 3 apples make how many?", options: ["4", "5", "6"], tokens: [], left: [], right: [], answer: { value: "5" } },
  { type: "drag", concept: "Putting groups together", prompt: "Put the numbers in order to show 2 + 2 = 4", options: [], tokens: ["2", "+", "2", "=", "4"], left: [], right: [], answer: { items: ["2", "+", "2", "=", "4"] } },
  { type: "matching", concept: "Addition facts", prompt: "Match each addition to its sum", options: [], tokens: [], left: ["1 + 2", "2 + 2", "3 + 2"], right: ["5", "3", "4"], answer: { pairs: [{ left: "1 + 2", right: "3" }, { left: "2 + 2", right: "4" }, { left: "3 + 2", right: "5" }] } },
  { type: "counting", concept: "Counting objects", prompt: "Count all the apples: 🍎🍎 + 🍎🍎🍎", options: [], tokens: [], left: [], right: [], answer: { value: "5" } },
  { type: "direct", concept: "Addition facts", prompt: "What is 4 + 3?", options: [], tokens: [], left: [], right: [], answer: { value: "7" } },
] as const;
const adventure = [
  templates[0],
  templates[1],
  templates[2],
  templates[3],
  templates[4],
  { type: "ordering", concept: "Number order", prompt: "Put these numbers in order from smallest to biggest", options: [], tokens: ["3", "1", "2"], left: [], right: [], answer: { items: ["1", "2", "3"] } },
];

let pending: Promise<void> | undefined;
export function ensureActivitiesReady(): Promise<void> {
  pending ??= (async () => {
    await ensureLearningReady();
    await db.transaction(async tx => {
      await tx.insert(learningLessons).values([
        { id: "textbook-subtraction", subjectId: "math", title: "Lesson 3: Subtraction" },
        { id: "textbook-shapes", subjectId: "math", title: "Lesson 4: Shapes" },
      ]).onConflictDoNothing();
      for (const [id, title, kind] of [
        ["addition-homework", "Addition Homework", "homework"],
        ["addition-practice", "Addition Practice", "practice"],
        ["addition-exam", "Addition Exam", "exam"],
        ["addition-adventure-v2", "Math Adventure", "exam"],
      ]) {
        await tx.insert(activities).values({ id, title, kind, lessonId: "addition" }).onConflictDoNothing();
        for (const [index, q] of (id === "addition-adventure-v2" ? adventure : templates).entries()) {
          await tx.insert(activityQuestions).values({
            ...q, id: `${id}-${index + 1}`, activityId: id, index,
            options: [...q.options], tokens: [...q.tokens], left: [...q.left], right: [...q.right],
            answer: q.answer,
          }).onConflictDoNothing();
        }
      }
      for (const page of pages.filter(p => p.questions.length)) {
        const activityId = activityIdForPage(page.number);
        await tx.insert(activities).values({ id: activityId, title: `${page.title} · page ${page.number}`, kind: "homework", lessonId: lessonIdForPage(page.number) }).onConflictDoNothing();
        for (const [index, q] of page.questions.entries()) {
          await tx.insert(activityQuestions).values({
            id: `${activityId}-${index + 1}`, activityId, index, type: q.type, concept: q.concept,
            prompt: q.prompt, answer: q.answer, options: q.options, tokens: q.tokens, left: q.left, right: q.right,
          }).onConflictDoNothing();
        }
      }
    });
  })().catch(error => { pending = undefined; throw error; });
  return pending;
}