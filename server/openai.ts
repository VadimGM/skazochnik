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
  log(`[OpenAI:Text] Начинаю генерацию текста сказки для "${req.childName}" (${req.gender}, ${req.age} лет)`, "openai");
  log(`[OpenAI:Text] Параметры: тема="${req.theme}", уроки=[${req.lessons.join(", ")}], компаньон="${req.companion || "нет"}"`, "openai");

  const genderWord = req.gender === "boy" ? "мальчик" : "девочка";
  const genderPronoun = req.gender === "boy" ? "он" : "она";
  const genderEng = req.gender === "boy" ? "boy" : "girl";
  const themDesc = THEME_LABELS[req.theme] || req.theme;
  const lessonsList = req.lessons.map(l => LESSON_LABELS[l] || l).join(", ");
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
  "characterDescription": "Consistent English description of the main character for all illustrations. Include: '${genderEng}, approximately ${req.age} years old'. Describe general appearance traits that stay the same across all images.",
  "pages": [
    {
      "type": "cover",
      "title": "Название сказки",
      "text": "Сказка для ${req.childName}",
      "imagePrompt": "A magical fairy tale book cover illustration. A ${genderEng}, approximately ${req.age} years old, standing in [setting]. Style: cozy children's book illustration, watercolor style, soft pastel colors, warm lighting. The child is the central figure. No text or letters in the image."
    },
    {
      "type": "content",
      "text": "Текст эпизода",
      "imagePrompt": "Detailed English prompt describing the most vivid/brightest moment of this page. A ${genderEng}, approximately ${req.age} years old, [action in scene]. Style: cozy children's book illustration, watercolor style, soft pastel colors, warm lighting. No text or letters in the image."
    },
    ...ещё ${contentPages - 1} content страниц...
    {
      "type": "end",
      "text": "Конец. [Тёплое послесловие, одно предложение]",
      "imagePrompt": "A heartwarming closing illustration. A ${genderEng}, approximately ${req.age} years old, [peaceful happy scene]. Style: cozy children's book illustration, watercolor style, soft pastel colors, warm golden lighting. No text or letters in the image."
    }
  ]
}

ПРАВИЛА ДЛЯ imagePrompt:
- На АНГЛИЙСКОМ языке
- Описывай самый яркий момент страницы
- Единый стиль для всех: "cozy children's book illustration, watercolor style, soft pastel colors, warm lighting"
- Всегда включай описание главного героя: "A ${genderEng}, approximately ${req.age} years old"
- Обязательно добавляй "No text or letters in the image."
- Описывай конкретную сцену, позу, окружение`;

  log(`[OpenAI:Text] Отправляю запрос к GPT-4o-mini (max_tokens=4000, temperature=0.85, ${contentPages + 2} страниц)...`, "openai");

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
    log(`[OpenAI:Text] ОШИБКА запроса к GPT-4o-mini после ${elapsed}с: ${err.message}`, "openai");
    log(`[OpenAI:Text] Статус: ${err.status || "N/A"}, Тип: ${err.type || "N/A"}, Код: ${err.code || "N/A"}`, "openai");
    if (err.error) {
      log(`[OpenAI:Text] Детали ошибки API: ${JSON.stringify(err.error)}`, "openai");
    }
    throw err;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const usage = response.usage;
  log(`[OpenAI:Text] Ответ получен за ${elapsed}с. Токены: prompt=${usage?.prompt_tokens || "?"}, completion=${usage?.completion_tokens || "?"}, total=${usage?.total_tokens || "?"}`, "openai");
  log(`[OpenAI:Text] finish_reason: ${response.choices[0]?.finish_reason || "unknown"}`, "openai");

  const content = response.choices[0]?.message?.content;
  if (!content) {
    log(`[OpenAI:Text] ОШИБКА: Пустой ответ от GPT-4o-mini. response.choices: ${JSON.stringify(response.choices)}`, "openai");
    throw new Error("Empty response from OpenAI");
  }

  log(`[OpenAI:Text] Длина сырого ответа: ${content.length} символов`, "openai");

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (parseErr: any) {
    log(`[OpenAI:Text] ОШИБКА парсинга JSON: ${parseErr.message}`, "openai");
    log(`[OpenAI:Text] Сырой ответ (первые 500 символов): ${content.substring(0, 500)}`, "openai");
    throw new Error(`Failed to parse OpenAI response as JSON: ${parseErr.message}`);
  }

  const characterDescription = parsed.characterDescription || parsed.character_description || "";
  const pages: GeneratedPage[] = parsed.pages || parsed.story || [];

  if (!Array.isArray(pages) || pages.length === 0) {
    log(`[OpenAI:Text] ОШИБКА: Неверный формат. Ключи: [${Object.keys(parsed).join(", ")}]`, "openai");
    log(`[OpenAI:Text] Сырой JSON (первые 500 символов): ${JSON.stringify(parsed).substring(0, 500)}`, "openai");
    throw new Error("Invalid story format from OpenAI");
  }

  log(`[OpenAI:Text] Успешно: ${pages.length} страниц, characterDescription=${characterDescription.length} символов`, "openai");
  log(`[OpenAI:Text] characterDescription: "${characterDescription.substring(0, 200)}..."`, "openai");
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    log(`[OpenAI:Text]   Стр.${i + 1}: type="${p.type}", текст=${p.text?.length || 0} симв, title="${p.title || "-"}", imagePrompt=${p.imagePrompt?.length || 0} симв`, "openai");
  }

  return { pages, characterDescription };
}
