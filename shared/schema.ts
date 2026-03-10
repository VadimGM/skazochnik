import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const stories = pgTable("stories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childName: text("child_name").notNull(),
  gender: text("gender").notNull(),
  age: integer("age").notNull(),
  theme: text("theme").notNull(),
  companion: text("companion"),
  lessons: text("lessons").array().notNull(),
  photoUrl: text("photo_url"),
  title: text("title").notNull(),
  pages: jsonb("pages").notNull().$type<StoryPage[]>(),
  status: text("status").notNull().default("generating"),
  createdAt: timestamp("created_at").defaultNow(),
});

export interface StoryPage {
  type: "cover" | "content" | "end";
  text: string;
  imageUrl: string;
  title?: string;
}

export const insertStorySchema = createInsertSchema(stories).omit({
  id: true,
  createdAt: true,
});

export type InsertStory = z.infer<typeof insertStorySchema>;
export type Story = typeof stories.$inferSelect;
