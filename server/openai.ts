import OpenAI from "openai";
import { log } from "./index";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface StoryRequest {
  childName: string;
  gender: "boy" | "girl";
  age: number;
  theme: string;
  companion?: string;
  lessons: string[];
  customMoral?: string;
}

export interface GeneratedPage {
  type: "cover" | "content" | "end";
  title?: string;
  text: string;
  imagePrompt: string;
}

const THEME_LABELS: Record<string, string> = {
  forest: "волшебный лес с говорящими деревьями, светящимися грибами и лесными существами",
  space: "космическое приключение среди звёзд, планет и дружелюбных инопланетян",
  underwater: "подводный мир с коралловыми рифами, русалками и морскими существами",
  castle: "волшебный замок с драконами, рыцарями и магическими комнатами",
  village: "уютная сказочная деревня с бабушкиным домиком, садом и добрыми жителями",
};

const LESSON_LABELS: Record<string, string> = {
  kindness: "доброта и помощь другим",
  courage: "смелость и умение преодолевать страхи",
  friendship: "настоящая дружба и верность",
  honesty: "честность и правдивость",
  curiosity: "любопытство и жажда знаний",
};

function getPageCount(age: number): number {
  if (age <= 4) return 5;
  if (age <= 6) return 6;
  if (age <= 8) return 7;
  return 8;
}

function getWordRange(age: number): string {
  if (age <= 4) return "200–400 слов на всю сказку, очень простые и короткие предложения, 2-3 предложения на страницу";
  if (age <= 6) return "400–600 слов на всю сказку, простые предложения, 3-4 предложения на страницу";
  if (age <= 8) return "400–700 слов на всю сказку, развёрнутые предложения с описаниями, 4-5 предложений на страницу";
  return "600–900 слов на всю сказку, сложный сюжет с деталями, 5-6 предложений на страницу";
}

export async function generateStoryText(req: StoryRequest): Promise<{ pages: GeneratedPage[]; characterDescription: string }> {
  const startTime = Date.now();

  const genderWord = req.gender === "boy" ? "мальчик" : "девочка";
  const genderPronoun = req.gender === "boy" ? "он" : "она";
  const genderEng = req.gender === "boy" ? "boy" : "girl";
  const themDesc = THEME_LABELS[req.theme] || req.theme;
  const lessonsLabels = req.lessons.map(l => LESSON_LABELS[l] || l);
  if (req.customMoral && req.customMoral.trim()) {
    lessonsLabels.push(req.customMoral.trim());
  }
  const lessonsList = lessonsLabels.join(", ");
  const companionNote = req.companion ? `У героя есть верный друг/питомец: ${req.companion}. Друг/питомец должен участвовать в сюжете.` : "";
  const contentPages = getPageCount(req.age);
  const wordRange = getWordRange(req.age);

  const systemPrompt = `Ты — талантливый детский писатель-сказочник. Пиши на русском языке красивые, тёплые, добрые сказки для детей.
Текст должен быть подходящим для ребёнка ${req.age} лет.
${wordRange}.
Используй яркие образы, метафоры и сказочный язык. Сказка должна быть тёплой, волшебной и заканчиваться хорошо.
Сюжет должен развиваться по нарастающей: завязка → приключение → кульминация → развязка.`;

  const userPrompt = `Напиши детскую сказку.

Главный герой: ${genderWord} по имени ${req.childName}, ${req.age} лет.
Атмосфера/сеттинг: ${themDesc}.
Мораль/урок: ${lessonsList}.
${companionNote}

ВАЖНО: Используй имя "${req.childName}" в тексте. ${genderPronoun.charAt(0).toUpperCase() + genderPronoun.slice(1)} — главный герой.

Структура сказки:
1. ОБЛОЖКА (type: "cover") — только название сказки и имя автора "Сказка для ${req.childName}"
2. ${contentPages} СТРАНИЦ ТЕКСТА (type: "content") — сама сказка, по нарастающей
3. ФИНАЛ (type: "end") — последняя страница с текстом "Конец" и одним тёплым предложением-послесловием

Всего: ${contentPages + 2} страниц (обложка + ${contentPages} контентных + финал).

Ответь СТРОГО в формате JSON объекта:
{
  "characterDescription": "${genderEng}, approximately ${req.age} years old",
  "pages": [
    {
      "type": "cover",
      "title": "Название сказки",
      "text": "Сказка для ${req.childName}",
      "imagePrompt": "Scene description for the cover: the child stands in [describe setting from the story theme]. Full body view, the child is the central figure, facing the viewer. Background: [detailed magical setting]. No other human characters."
    },
    {
      "type": "content",
      "text": "Текст эпизода",
      "imagePrompt": "Scene description: the child [specific action/pose from this episode]. Setting: [detailed environment]. Emotion: [what the child feels]. Camera angle: [close-up / medium shot / full body]. No other human characters unless essential to the plot."
    },
    ...ещё ${contentPages - 1} content страниц...
    {
      "type": "end",
      "text": "Конец. [Тёплое послесловие, одно предложение]",
      "imagePrompt": "Closing scene: the child [peaceful happy pose/action]. Setting: [warm, cozy environment]. The child looks content and happy. Full body view. Warm golden lighting."
    }
  ]
}

ПРАВИЛА ДЛЯ imagePrompt:
- На АНГЛИЙСКОМ языке
- НЕ описывай внешность ребёнка (цвет волос, глаз, одежду) — внешность берётся из загруженной фотографии автоматически
- Описывай ТОЛЬКО сцену: что делает ребёнок, где находится, какие эмоции, окружающие предметы/существа
- Указывай ракурс камеры: "full body view", "medium shot from waist up", "close-up portrait"
- Описывай освещение, атмосферу, детали фона
- НЕ добавляй стиль рисования — он задаётся отдельно
- Обязательно: "No text or letters in the image."
- Каждый промпт должен описывать КОНКРЕТНЫЙ момент из текста страницы`;

  let response;
  try {
    response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.85,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });
  } catch (err: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`[OpenAI] ОШИБКА: ${err.message}`, "openai");
    throw err;
  }

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (parseErr: any) {
    throw new Error(`Failed to parse OpenAI response: ${parseErr.message}`);
  }

  const characterDescription = parsed.characterDescription || parsed.character_description || "";
  const pages: GeneratedPage[] = parsed.pages || parsed.story || [];

  if (!Array.isArray(pages) || pages.length === 0) {
    throw new Error("Invalid story format from OpenAI");
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`[OpenAI] Text: ${pages.length} pages за ${elapsed}с`, "openai");

  return { pages, characterDescription };
}
