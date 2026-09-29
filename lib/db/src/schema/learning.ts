import { pgTable, text, integer, boolean, timestamp, uuid, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";

export const learningGrades = pgTable("learning_grades", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
});

export const learningSubjects = pgTable("learning_subjects", {
  id: text("id").primaryKey(),
  gradeId: text("grade_id").notNull().references(() => learningGrades.id),
  title: text("title").notNull(),
});

export const learningLessons = pgTable("learning_lessons", {
  id: text("id").primaryKey(),
  subjectId: text("subject_id").notNull().references(() => learningSubjects.id),
  title: text("title").notNull(),
});

export const learningScenes = pgTable("learning_scenes", {
  id: text("id").primaryKey(),
  // Nullable for the existing rows until the idempotent curriculum backfill runs.
  lessonId: text("lesson_id").references(() => learningLessons.id),
  index: integer("scene_index").notNull(),
  title: text("title").notNull(),
  caption: text("caption").notNull(),
  color: text("color").notNull(),
  type: text("type").notNull(),
  durationMs: integer("duration_ms"),
  a: integer("operand_a").notNull(),
  b: integer("operand_b").notNull(),
  options: integer("options").array().notNull(),
  questionId: text("question_id"),
  answer: integer("answer"),
}, (t) => [uniqueIndex("learning_scenes_lesson_index").on(t.lessonId, t.index)]);

export const learningChildren = pgTable("learning_children", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  currentSceneIndex: integer("current_scene_index").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const learningEnrollments = pgTable("learning_enrollments", {
  childId: uuid("child_id").notNull().references(() => learningChildren.id),
  lessonId: text("lesson_id").notNull().references(() => learningLessons.id),
  currentSceneIndex: integer("current_scene_index").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.childId, t.lessonId] })]);

export const learningSessions = pgTable("learning_sessions", {
  id: uuid("id").primaryKey(),
  childId: uuid("child_id").notNull().references(() => learningChildren.id),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const learningProgress = pgTable("learning_progress", {
  childId: uuid("child_id").notNull().references(() => learningChildren.id),
  sceneId: text("scene_id").notNull().references(() => learningScenes.id),
  positionPercent: integer("position_percent").notNull().default(0),
  movedCount: integer("moved_count").notNull().default(0),
  solved: boolean("solved").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (t) => [primaryKey({ columns: [t.childId, t.sceneId] })]);

export const learningAttempts = pgTable("learning_attempts", {
  id: uuid("id").primaryKey(),
  childId: uuid("child_id").notNull().references(() => learningChildren.id),
  sceneId: text("scene_id").notNull().references(() => learningScenes.id),
  requestId: uuid("request_id"),
  answer: integer("answer"),
  correct: boolean("correct").notNull(),
  independent: boolean("independent").notNull().default(false),
  feedback: text("feedback").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("learning_attempt_child_request").on(t.childId, t.requestId)]);

export const learningExplanations = pgTable("learning_explanations", {
  id: uuid("id").primaryKey(),
  childId: uuid("child_id").notNull().references(() => learningChildren.id),
  sceneId: text("scene_id").notNull().references(() => learningScenes.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});