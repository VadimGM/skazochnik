import { db } from "./db";
import { stories, type Story, type InsertStory } from "@shared/schema";
import { eq } from "drizzle-orm";
import { log } from "./index";

export interface IStorage {
  createStory(story: InsertStory): Promise<Story>;
  getStory(id: string): Promise<Story | undefined>;
  updateStory(id: string, data: Partial<InsertStory>): Promise<Story | undefined>;
}

export class DatabaseStorage implements IStorage {
  async createStory(story: InsertStory): Promise<Story> {
    log(`[Storage] INSERT stories: childName="${story.childName}", theme="${story.theme}", status="${story.status}"`, "storage");
    const [created] = await db.insert(stories).values(story).returning();
    log(`[Storage] INSERT OK: id="${created.id}"`, "storage");
    return created;
  }

  async getStory(id: string): Promise<Story | undefined> {
    const [story] = await db.select().from(stories).where(eq(stories.id, id));
    if (story) {
      log(`[Storage] SELECT id="${id}": found, status="${story.status}"`, "storage");
    } else {
      log(`[Storage] SELECT id="${id}": not found`, "storage");
    }
    return story;
  }

  async updateStory(id: string, data: Partial<InsertStory>): Promise<Story | undefined> {
    const fields = Object.keys(data).join(", ");
    log(`[Storage] UPDATE id="${id}": fields=[${fields}]`, "storage");
    const [updated] = await db.update(stories).set(data).where(eq(stories.id, id)).returning();
    if (updated) {
      log(`[Storage] UPDATE OK id="${id}": status="${updated.status}"`, "storage");
    } else {
      log(`[Storage] UPDATE FAILED: id="${id}" не найден`, "storage");
    }
    return updated;
  }
}

export const storage = new DatabaseStorage();
