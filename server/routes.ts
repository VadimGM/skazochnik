import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateStoryText, type GeneratedPage } from "./openai";
import type { StoryPage } from "@shared/schema";
import { generateIllustration } from "./nanoBanana";
import { generateStoryPdf } from "./pdf";
import { log } from "./index";
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

function getPublicBaseUrl(): string {
  const domain = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN;
  if (domain) {
    return `https://${domain}`;
  }
  return `http://localhost:${process.env.PORT || 5000}`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use("/uploads", (req, res, next) => {
    const filePath = path.join(uploadsDir, path.basename(req.path));
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      log(`[Uploads] Файл не найден: ${req.path}`, "routes");
      res.status(404).json({ message: "File not found" });
    }
  });

  app.get("/api/proxy-image", async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).json({ message: "Missing url parameter" });
    }
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return res.status(response.status).json({ message: "Failed to fetch image" });
      }
      const contentType = response.headers.get("content-type") || "image/png";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=3600");
      const buffer = Buffer.from(await response.arrayBuffer());
      res.send(buffer);
    } catch (err: any) {
      log(`[ProxyImage] Ошибка загрузки: ${err.message}`, "routes");
      res.status(500).json({ message: "Proxy error" });
    }
  });

  app.post("/api/stories", upload.single("photo"), async (req, res) => {
    try {
      const { childName, gender, age, theme, companion, lessons, customMoral } = req.body;

      if (!childName || !gender || !age || !theme || !lessons) {
        const missing = [];
        if (!childName) missing.push("childName");
        if (!gender) missing.push("gender");
        if (!age) missing.push("age");
        if (!theme) missing.push("theme");
        if (!lessons) missing.push("lessons");
        return res.status(400).json({ message: `Missing required fields: ${missing.join(", ")}` });
      }

      let parsedLessons: string[];
      try {
        parsedLessons = typeof lessons === "string" ? JSON.parse(lessons) : lessons;
      } catch (parseErr: any) {
        return res.status(400).json({ message: "Invalid lessons format" });
      }

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
        customMoral: customMoral || undefined,
        photoUrl,
      }).catch((err) => {
        log(`[GenerateAsync] ОШИБКА id="${story.id}": ${err.message}`, "generate");
        storage.updateStory(story.id, { status: "error" }).catch(() => {});
      });

    } catch (error: any) {
      log(`[POST /api/stories] ОШИБКА: ${error.message}`, "routes");
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  app.get("/api/stories/:id", async (req, res) => {
    const storyId = req.params.id;
    try {
      const story = await storage.getStory(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }
      res.json(story);
    } catch (error: any) {
      log(`[GET /api/stories/${storyId}] ОШИБКА: ${error.message}`, "routes");
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  app.get("/api/stories/:id/pdf", async (req, res) => {
    const storyId = req.params.id;
    try {
      const story = await storage.getStory(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }
      if (story.status !== "complete") {
        return res.status(400).json({ message: "Story is not complete yet" });
      }

      const pdfBuffer = await generateStoryPdf(
        story.title,
        story.pages as any,
        story.childName,
      );

      const filename = encodeURIComponent(story.title || "Сказка") + ".pdf";
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.end(pdfBuffer);
    } catch (error: any) {
      log(`[PDF] id="${storyId}" ОШИБКА: ${error.message}`, "routes");
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  app.post("/api/stories/:id/regenerate", async (req, res) => {
    const storyId = req.params.id;
    try {
      const story = await storage.getStory(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      await storage.updateStory(storyId, {
        status: "generating",
        pages: [],
        title: "Перегенерация...",
      });

      res.json({ id: storyId, status: "generating" });

      generateStoryAsync(storyId, {
        childName: story.childName,
        gender: story.gender as "boy" | "girl",
        age: story.age,
        theme: story.theme,
        companion: story.companion || undefined,
        lessons: story.lessons,
        photoUrl: story.photoUrl,
      }).catch((err) => {
        log(`[Regenerate] ОШИБКА id="${storyId}": ${err.message}`, "generate");
        storage.updateStory(storyId, { status: "error" });
      });

    } catch (error: any) {
      log(`[Regenerate] ОШИБКА: ${error.message}`, "routes");
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
  customMoral?: string;
  photoUrl?: string | null;
}) {
  const totalStart = Date.now();

  await storage.updateStory(storyId, { progress: "Пишем сказку..." });
  const { pages: textPages, characterDescription } = await generateStoryText(params);

  const coverPage = textPages.find(p => p.type === "cover");
  const title = coverPage?.title || "Волшебная сказка";

  const publicBaseUrl = getPublicBaseUrl();
  const photoPublicUrl = params.photoUrl ? `${publicBaseUrl}${params.photoUrl}` : null;

  await storage.updateStory(storyId, { progress: `Создаём иллюстрации: 0 из ${textPages.length}` });

  const pageResults: StoryPage[] = new Array(textPages.length);

  const PARALLEL_LIMIT = 3;
  let completedCount = 0;

  const generateOne = async (i: number) => {
    const page = textPages[i];

    if (page.type === "end") {
      pageResults[i] = {
        type: page.type,
        title: page.title || undefined,
        text: page.text,
        imageUrl: "",
      };
      completedCount++;
      await storage.updateStory(storyId, { progress: `Создаём иллюстрации: ${completedCount} из ${textPages.length}` });
      return;
    }

    let imageUrl = "";

    if (photoPublicUrl && page.imagePrompt) {
      const enhancedPrompt = `Edit this photo of a real child into a fairy tale illustration. CRITICAL: Preserve the child's exact appearance from the photo — same face, same hair color and style, same body proportions, similar clothing style. The child must be clearly recognizable as the same person from the original photo.

Style: cozy children's book illustration, watercolor and digital art style, soft pastel colors, warm magical lighting, storybook aesthetic.

${page.imagePrompt}

No text or letters in the image. The child from the reference photo is the main character — keep their likeness accurate and consistent.`;

      try {
        imageUrl = await generateIllustration(enhancedPrompt, photoPublicUrl, i);
      } catch (err: any) {
        log(`[Illustration] img ${i + 1} ОШИБКА: ${err.message}`, "generate");
        imageUrl = "";
      }
    }

    pageResults[i] = {
      type: page.type,
      title: page.title || undefined,
      text: page.text,
      imageUrl,
    };

    completedCount++;
    await storage.updateStory(storyId, { progress: `Создаём иллюстрации: ${completedCount} из ${textPages.length}` });
  };

  const semaphore = async () => {
    const queue = Array.from({ length: textPages.length }, (_, i) => i);
    const workers = Array.from({ length: PARALLEL_LIMIT }, async () => {
      while (queue.length > 0) {
        const idx = queue.shift()!;
        await generateOne(idx);
      }
    });
    await Promise.all(workers);
  };

  await semaphore();

  const successImages = pageResults.filter(p => p.imageUrl).length;

  try {
    await storage.updateStory(storyId, {
      title,
      pages: pageResults,
      status: "complete",
    });
    const totalElapsed = ((Date.now() - totalStart) / 1000).toFixed(1);
    log(`[Generate] id="${storyId}" ГОТОВО за ${totalElapsed}с (${successImages}/${pageResults.length} img)`, "generate");
  } catch (dbErr: any) {
    log(`[Generate] id="${storyId}" DB ОШИБКА: ${dbErr.message}`, "generate");
    throw dbErr;
  }
}
