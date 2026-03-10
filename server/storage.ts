import { db } from "./db";
import { stories, type Story, type InsertStory } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  createStory(story: InsertStory): Promise<Story>;
  getStory(id: string): Promise<Story | undefined>;
  updateStory(id: string, data: Partial<InsertStory>): Promise<Story | undefined>;
}

export class DatabaseStorage implements IStorage {
  async createStory(story: InsertStory): Promise<Story> {
    const [created] = await db.insert(stories).values(story).returning();
    return created;
  }

  async getStory(id: string): Promise<Story | undefined> {
    const [story] = await db.select().from(stories).where(eq(stories.id, id));
    return story;
  }

  async updateStory(id: string, data: Partial<InsertStory>): Promise<Story | undefined> {
    const [updated] = await db.update(stories).set(data).where(eq(stories.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
