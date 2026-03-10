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

interface GeneratedPage {
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

export async function generateStoryText(req: StoryRequest): Promise<GeneratedPage[]> {
  const startTime = Date.now();
  log(`[OpenAI:Text] Начинаю генерацию текста сказки для "${req.childName}" (${req.gender}, ${req.age} лет)`, "openai");
  log(`[OpenAI:Text] Параметры: тема="${req.theme}", уроки=[${req.lessons.join(", ")}], компаньон="${req.companion || "нет"}"`, "openai");

  const genderWord = req.gender === "boy" ? "мальчик" : "девочка";
  const genderPronoun = req.gender === "boy" ? "он" : "она";
  const themDesc = THEME_LABELS[req.theme] || req.theme;
  const lessonsList = req.lessons.map(l => LESSON_LABELS[l] || l).join(", ");
  const companionNote = req.companion ? `У героя есть верный друг/питомец: ${req.companion}. Друг/питомец должен участвовать в сюжете.` : "";

  const systemPrompt = `Ты — талантливый детский писатель-сказочник. Пиши на русском языке красивые, добрые сказки для детей. 
Текст должен быть подходящим для ребёнка ${req.age} лет: простые предложения для маленьких (2-4 года), более сложный сюжет для старших (8-12 лет).
Используй яркие образы, метафоры и сказочный язык. Сказка должна быть тёплой и заканчиваться хорошо.`;

  const userPrompt = `Напиши детскую сказку из 5 страниц (эпизодов).

Главный герой: ${genderWord} по имени ${req.childName}, ${req.age} лет.
Атмосфера/сеттинг: ${themDesc}.
Мораль/урок: ${lessonsList}.
${companionNote}

ВАЖНО: Используй имя "${req.childName}" в тексте. ${genderPronoun.charAt(0).toUpperCase() + genderPronoun.slice(1)} — главный герой.

Ответь СТРОГО в формате JSON массива из 5 объектов:
[
  {
    "title": "Название сказки (только для первой страницы)",
    "text": "Текст эпизода (3-5 предложений)",
    "imagePrompt": "Detailed English prompt for a children's book watercolor illustration depicting this scene. Include the child character (${req.gender === "boy" ? "a boy" : "a girl"}, approximately ${req.age} years old) as the main focus. Style: warm watercolor, soft colors, magical atmosphere, children's book illustration."
  }
]

Для страниц 2-5 поле "title" не указывай (null).
imagePrompt должен быть на АНГЛИЙСКОМ и описывать конкретную сцену для иллюстрации в стиле детской книжной акварели.`;

  log(`[OpenAI:Text] Отправляю запрос к GPT-4o (max_tokens=3000, temperature=0.85)...`, "openai");

  let response;
  try {
    response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.85,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });
  } catch (err: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`[OpenAI:Text] ОШИБКА запроса к GPT-4o после ${elapsed}с: ${err.message}`, "openai");
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
    log(`[OpenAI:Text] ОШИБКА: Пустой ответ от GPT-4o. Полный response.choices: ${JSON.stringify(response.choices)}`, "openai");
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

  const pages: GeneratedPage[] = Array.isArray(parsed) ? parsed : parsed.pages || parsed.story || Object.values(parsed)[0];
  
  if (!Array.isArray(pages) || pages.length === 0) {
    log(`[OpenAI:Text] ОШИБКА: Неверный формат ответа. Ключи: [${Object.keys(parsed).join(", ")}]. Тип значения: ${typeof pages}`, "openai");
    log(`[OpenAI:Text] Сырой JSON: ${JSON.stringify(parsed).substring(0, 500)}`, "openai");
    throw new Error("Invalid story format from OpenAI");
  }

  log(`[OpenAI:Text] Успешно получено ${pages.length} страниц сказки "${pages[0]?.title || "без заголовка"}"`, "openai");
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    log(`[OpenAI:Text]   Стр.${i + 1}: текст=${p.text?.length || 0} символов, title=${p.title ? "да" : "нет"}, imagePrompt=${p.imagePrompt?.length || 0} символов`, "openai");
  }

  return pages;
}

export async function generateStoryImage(prompt: string, pageIndex: number): Promise<string> {
  const startTime = Date.now();
  log(`[OpenAI:Image] Начинаю генерацию иллюстрации для стр.${pageIndex + 1}`, "openai");
  log(`[OpenAI:Image] Промпт (первые 200 символов): ${prompt.substring(0, 200)}...`, "openai");

  let response;
  try {
    response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt + " No text or letters in the image.",
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });
  } catch (err: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`[OpenAI:Image] ОШИБКА генерации иллюстрации стр.${pageIndex + 1} после ${elapsed}с: ${err.message}`, "openai");
    log(`[OpenAI:Image] Статус: ${err.status || "N/A"}, Тип: ${err.type || "N/A"}, Код: ${err.code || "N/A"}`, "openai");
    if (err.error) {
      log(`[OpenAI:Image] Детали ошибки API: ${JSON.stringify(err.error)}`, "openai");
    }
    throw err;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const url = response.data[0]?.url || "";
  const revisedPrompt = response.data[0]?.revised_prompt;

  if (url) {
    log(`[OpenAI:Image] Иллюстрация стр.${pageIndex + 1} готова за ${elapsed}с. URL длина: ${url.length}`, "openai");
  } else {
    log(`[OpenAI:Image] ВНИМАНИЕ: Пустой URL для стр.${pageIndex + 1}. Полный response.data: ${JSON.stringify(response.data)}`, "openai");
  }

  if (revisedPrompt) {
    log(`[OpenAI:Image] DALL-E revised prompt стр.${pageIndex + 1} (первые 150 символов): ${revisedPrompt.substring(0, 150)}...`, "openai");
  }

  return url;
}
