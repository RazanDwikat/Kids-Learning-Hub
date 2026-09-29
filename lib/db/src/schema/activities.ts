import { pgTable, text, integer, timestamp, uuid, boolean, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { learningChildren, learningLessons } from "./learning";

export const activities = pgTable("activities", {
  id: text("id").primaryKey(),
  lessonId: text("lesson_id").notNull().references(() => learningLessons.id),
  title: text("title").notNull(),
  kind: text("kind").notNull(),
});
export const activityQuestions = pgTable("activity_questions", {
  id: text("id").primaryKey(),
  activityId: text("activity_id").notNull().references(() => activities.id),
  index: integer("question_index").notNull(),
  type: text("type").notNull(),
  concept: text("concept").notNull(),
  prompt: text("prompt").notNull(),
  options: text("options").array().notNull().default([]),
  tokens: text("tokens").array().notNull().default([]),
  left: text("left_items").array().notNull().default([]),
  right: text("right_items").array().notNull().default([]),
  answer: jsonb("answer").notNull(),
}, t => [uniqueIndex("activity_questions_activity_index").on(t.activityId, t.index)]);
export const activityRuns = pgTable("activity_runs", {
  id: uuid("id").primaryKey(),
  childId: uuid("child_id").notNull().references(() => learningChildren.id),
  activityId: text("activity_id").notNull().references(() => activities.id),
  requestId: uuid("request_id").notNull(),
  currentIndex: integer("current_index").notNull().default(0),
  correctCount: integer("correct_count").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  rewardSnapshot: jsonb("reward_snapshot"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [uniqueIndex("activity_runs_child_request").on(t.childId, t.requestId)]);
export const activityAttempts = pgTable("activity_attempts", {
  id: uuid("id").primaryKey(),
  childId: uuid("child_id").notNull().references(() => learningChildren.id),
  runId: uuid("run_id").notNull().references(() => activityRuns.id),
  questionId: text("question_id").notNull().references(() => activityQuestions.id),
  requestId: uuid("request_id").notNull(),
  answer: jsonb("answer").notNull(),
  correct: boolean("correct").notNull(),
  feedback: text("feedback").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [uniqueIndex("activity_attempts_child_request").on(t.childId, t.requestId)]);

export const activityRewardConfigs = pgTable("activity_reward_configs", {
  childId: uuid("child_id").primaryKey().references(() => learningChildren.id),
  enabled: boolean("enabled").notNull().default(false),
  category: text("category").notNull().default("activity"),
  title: text("title").notNull().default(""),
  message: text("message").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertActivityRewardConfigSchema = createInsertSchema(activityRewardConfigs);
export type ActivityRewardConfig = typeof activityRewardConfigs.$inferSelect;

export const insertActivitySchema = createInsertSchema(activities);
export const insertActivityQuestionSchema = createInsertSchema(activityQuestions);
export const insertActivityRunSchema = createInsertSchema(activityRuns);
export const insertActivityAttemptSchema = createInsertSchema(activityAttempts);
export type Activity = typeof activities.$inferSelect;
export type ActivityQuestion = typeof activityQuestions.$inferSelect;
export type ActivityRun = typeof activityRuns.$inferSelect;
export type ActivityAttempt = typeof activityAttempts.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;