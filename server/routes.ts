import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateStoryText, generateStoryImage } from "./openai";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use("/uploads", (req, res, next) => {
    const filePath = path.join(uploadsDir, path.basename(req.path));
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "File not found" });
    }
  });

  app.post("/api/stories", upload.single("photo"), async (req, res) => {
    try {
      const { childName, gender, age, theme, companion, lessons } = req.body;

      if (!childName || !gender || !age || !theme || !lessons) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const parsedLessons = typeof lessons === "string" ? JSON.parse(lessons) : lessons;
      const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

      const story = await storage.createStory({
        childName,
        gender,
        age: parseInt(age, 10),
        theme,
        companion: companion || null,
        lessons: parsedLessons,
        photoUrl,
        title: "Генерация...",
        pages: [],
        status: "generating",
      });

      res.json({ id: story.id, status: "generating" });

      generateStoryAsync(story.id, {
        childName,
        gender,
        age: parseInt(age, 10),
        theme,
        companion: companion || undefined,
        lessons: parsedLessons,
      }).catch((err) => {
        console.error("Story generation failed:", err);
        storage.updateStory(story.id, { status: "error" });
      });

    } catch (error: any) {
      console.error("Error creating story:", error);
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  app.get("/api/stories/:id", async (req, res) => {
    try {
      const story = await storage.getStory(req.params.id);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }
      res.json(story);
    } catch (error: any) {
      console.error("Error fetching story:", error);
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  return httpServer;
}

async function generateStoryAsync(storyId: string, params: {
  childName: string;
  gender: "boy" | "girl";
  age: number;
  theme: string;
  companion?: string;
  lessons: string[];
}) {
  const textPages = await generateStoryText(params);

  const title = textPages[0]?.title || "Волшебная сказка";

  const pages = [];
  for (const page of textPages) {
    let imageUrl = "";
    try {
      imageUrl = await generateStoryImage(page.imagePrompt);
    } catch (err) {
      console.error("Image generation failed for page, using placeholder:", err);
      imageUrl = "";
    }
    pages.push({
      title: page.title || undefined,
      text: page.text,
      imageUrl,
    });
  }

  await storage.updateStory(storyId, {
    title,
    pages,
    status: "complete",
  });
}
