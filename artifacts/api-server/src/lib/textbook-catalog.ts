// Transcribed from attached_assets/0_Grade_1_Math_Example_Book_1790696657792.pdf;
// printed numbers, not PDF page indices. Examples and answer key are not exercises.
export const book = { id: "grade-1-math-example-book", grade: "Grade 1", subject: "Math", title: "Grade 1 Math Example Book" };
const arithmetic = (expressions: string[], answers: string[], operation: "Addition" | "Subtraction", picture = false) =>
  expressions.map((expression, index) => ({
    prompt: `${expression} = ____`,
    answer: { value: answers[index] },
    concept: operation,
    type: "direct",
    options: [] as string[], tokens: [] as string[], left: [] as string[], right: [] as string[],
    number: index + 1,
    // Only page 4 illustrates these equations, with apples/stars in alternating order.
    ...(picture ? { illustration: index % 2 === 0 ? "apples" : "stars" } : {}),
  }));
export const pages = [
  { number: 2, lesson: "Lesson 1: Counting", title: "Counting", questions: [] },
  { number: 3, lesson: "Lesson 2: Addition", title: "Addition examples", questions: [] },
  { number: 4, lesson: "Lesson 2: Addition", title: "Adding with Pictures", questions: arithmetic(["1 + 2", "2 + 3", "4 + 1", "3 + 3"], ["3", "5", "5", "6"], "Addition", true) },
  { number: 5, lesson: "Lesson 2: Addition", title: "Practice Time: Addition", questions: arithmetic(["1 + 2", "2 + 3", "4 + 1", "3 + 3", "5 + 2", "6 + 1", "4 + 4", "2 + 7", "5 + 5", "3 + 6"], ["3", "5", "5", "6", "7", "7", "8", "9", "10", "9"], "Addition") },
  { number: 6, lesson: "Lesson 3: Subtraction", title: "Subtraction examples", questions: [] },
  { number: 7, lesson: "Lesson 3: Subtraction", title: "Practice Time: Subtraction", questions: arithmetic(["4 - 1", "5 - 3", "6 - 2", "7 - 4", "8 - 3", "9 - 5", "10 - 4", "6 - 6", "8 - 2", "9 - 3"], ["3", "2", "4", "3", "5", "4", "6", "0", "6", "6"], "Subtraction") },
  { number: 8, lesson: "Lesson 4: Shapes", title: "Shapes", questions: [
    ["A ball is a ______________ shape.", "circle"],
    ["A door is a ______________ shape.", "rectangle"],
    ["A pizza slice is a ______________ shape.", "triangle"],
  ].map(([prompt, value], index) => ({ prompt, answer: { value }, concept: "Shapes", type: "direct", options: [] as string[], tokens: [] as string[], left: [] as string[], right: [] as string[], number: index + 1 })) },
  { number: 9, lesson: "Answer Key", title: "Answer Key", questions: [] },
];
export const activityIdForPage = (number: number) => `${book.id}-page-${number}`;
export const lessonIdForPage = (number: number) => number === 7 ? "textbook-subtraction" : number === 8 ? "textbook-shapes" : "addition";