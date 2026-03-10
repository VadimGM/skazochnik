import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateStoryText, generateStoryImage } from "./openai";
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

  app.post("/api/stories", upload.single("photo"), async (req, res) => {
    const requestStart = Date.now();
    log(`[POST /api/stories] Новый запрос на создание сказки`, "routes");

    try {
      const { childName, gender, age, theme, companion, lessons } = req.body;

      log(`[POST /api/stories] Полученные поля: childName="${childName}", gender="${gender}", age="${age}", theme="${theme}", companion="${companion || "нет"}"`, "routes");
      log(`[POST /api/stories] Фото: ${req.file ? `загружено (${req.file.originalname}, ${(req.file.size / 1024).toFixed(1)} КБ, ${req.file.mimetype})` : "не загружено"}`, "routes");

      if (!childName || !gender || !age || !theme || !lessons) {
        const missing = [];
        if (!childName) missing.push("childName");
        if (!gender) missing.push("gender");
        if (!age) missing.push("age");
        if (!theme) missing.push("theme");
        if (!lessons) missing.push("lessons");
        log(`[POST /api/stories] ОШИБКА: Отсутствуют обязательные поля: [${missing.join(", ")}]`, "routes");
        return res.status(400).json({ message: `Missing required fields: ${missing.join(", ")}` });
      }

      let parsedLessons: string[];
      try {
        parsedLessons = typeof lessons === "string" ? JSON.parse(lessons) : lessons;
        log(`[POST /api/stories] Уроки: [${parsedLessons.join(", ")}]`, "routes");
      } catch (parseErr: any) {
        log(`[POST /api/stories] ОШИБКА парсинга lessons: ${parseErr.message}. Сырое значение: "${lessons}"`, "routes");
        return res.status(400).json({ message: "Invalid lessons format" });
      }

      const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;
      if (photoUrl) {
        log(`[POST /api/stories] Фото сохранено: ${photoUrl}`, "routes");
      }

      log(`[POST /api/stories] Создаю запись в БД...`, "routes");
      let story;
      try {
        story = await storage.createStory({
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
        log(`[POST /api/stories] Запись создана в БД: id="${story.id}"`, "routes");
      } catch (dbErr: any) {
        log(`[POST /api/stories] ОШИБКА создания записи в БД: ${dbErr.message}`, "routes");
        log(`[POST /api/stories] Stack: ${dbErr.stack}`, "routes");
        throw dbErr;
      }

      const elapsed = ((Date.now() - requestStart) / 1000).toFixed(2);
      log(`[POST /api/stories] Ответ отправлен клиенту за ${elapsed}с: { id: "${story.id}", status: "generating" }`, "routes");
      res.json({ id: story.id, status: "generating" });

      log(`[POST /api/stories] Запускаю фоновую генерацию для id="${story.id}"...`, "routes");
      generateStoryAsync(story.id, {
        childName,
        gender,
        age: parseInt(age, 10),
        theme,
        companion: companion || undefined,
        lessons: parsedLessons,
      }).catch((err) => {
        log(`[GenerateAsync] КРИТИЧЕСКАЯ ОШИБКА генерации id="${story.id}": ${err.message}`, "routes");
        log(`[GenerateAsync] Stack: ${err.stack}`, "routes");
        storage.updateStory(story.id, { status: "error" }).catch((updateErr) => {
          log(`[GenerateAsync] ОШИБКА обновления статуса на "error" для id="${story.id}": ${updateErr.message}`, "routes");
        });
      });

    } catch (error: any) {
      const elapsed = ((Date.now() - requestStart) / 1000).toFixed(2);
      log(`[POST /api/stories] НЕОБРАБОТАННАЯ ОШИБКА за ${elapsed}с: ${error.message}`, "routes");
      log(`[POST /api/stories] Stack: ${error.stack}`, "routes");
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  app.get("/api/stories/:id", async (req, res) => {
    const storyId = req.params.id;
    try {
      const story = await storage.getStory(storyId);
      if (!story) {
        log(`[GET /api/stories/${storyId}] Сказка не найдена`, "routes");
        return res.status(404).json({ message: "Story not found" });
      }
      log(`[GET /api/stories/${storyId}] Отдаю сказку: status="${story.status}", pages=${(story.pages as any[])?.length || 0}`, "routes");
      res.json(story);
    } catch (error: any) {
      log(`[GET /api/stories/${storyId}] ОШИБКА: ${error.message}`, "routes");
      log(`[GET /api/stories/${storyId}] Stack: ${error.stack}`, "routes");
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
  const totalStart = Date.now();
  log(`[GenerateAsync] ========== НАЧАЛО ГЕНЕРАЦИИ id="${storyId}" ==========`, "generate");
  log(`[GenerateAsync] Параметры: ${JSON.stringify({ ...params, storyId })}`, "generate");

  log(`[GenerateAsync] Этап 1/2: Генерация текста сказки...`, "generate");
  const textStart = Date.now();
  const textPages = await generateStoryText(params);
  const textElapsed = ((Date.now() - textStart) / 1000).toFixed(1);
  log(`[GenerateAsync] Этап 1/2 завершён за ${textElapsed}с: получено ${textPages.length} страниц`, "generate");

  const title = textPages[0]?.title || "Волшебная сказка";
  log(`[GenerateAsync] Название сказки: "${title}"`, "generate");

  log(`[GenerateAsync] Этап 2/2: Генерация ${textPages.length} иллюстраций...`, "generate");
  const imagesStart = Date.now();
  const pages = [];
  for (let i = 0; i < textPages.length; i++) {
    const page = textPages[i];
    const pageStart = Date.now();
    log(`[GenerateAsync] Иллюстрация ${i + 1}/${textPages.length}: начинаю генерацию...`, "generate");

    let imageUrl = "";
    try {
      imageUrl = await generateStoryImage(page.imagePrompt, i);
      const pageElapsed = ((Date.now() - pageStart) / 1000).toFixed(1);
      log(`[GenerateAsync] Иллюстрация ${i + 1}/${textPages.length}: готова за ${pageElapsed}с`, "generate");
    } catch (err: any) {
      const pageElapsed = ((Date.now() - pageStart) / 1000).toFixed(1);
      log(`[GenerateAsync] ОШИБКА иллюстрации ${i + 1}/${textPages.length} после ${pageElapsed}с: ${err.message}`, "generate");
      log(`[GenerateAsync] Продолжаю без иллюстрации для стр.${i + 1}`, "generate");
      imageUrl = "";
    }
    pages.push({
      title: page.title || undefined,
      text: page.text,
      imageUrl,
    });
  }

  const imagesElapsed = ((Date.now() - imagesStart) / 1000).toFixed(1);
  const successImages = pages.filter(p => p.imageUrl).length;
  log(`[GenerateAsync] Этап 2/2 завершён за ${imagesElapsed}с: ${successImages}/${pages.length} иллюстраций успешно`, "generate");

  log(`[GenerateAsync] Сохраняю результат в БД для id="${storyId}"...`, "generate");
  try {
    await storage.updateStory(storyId, {
      title,
      pages,
      status: "complete",
    });
    log(`[GenerateAsync] БД обновлена: status="complete"`, "generate");
  } catch (dbErr: any) {
    log(`[GenerateAsync] ОШИБКА обновления БД для id="${storyId}": ${dbErr.message}`, "generate");
    log(`[GenerateAsync] Stack: ${dbErr.stack}`, "generate");
    throw dbErr;
  }

  const totalElapsed = ((Date.now() - totalStart) / 1000).toFixed(1);
  log(`[GenerateAsync] ========== ГЕНЕРАЦИЯ ЗАВЕРШЕНА id="${storyId}" за ${totalElapsed}с ==========`, "generate");
}
