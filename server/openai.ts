import OpenAI from "openai";

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

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.85,
    max_tokens: 3000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  const parsed = JSON.parse(content);
  const pages: GeneratedPage[] = Array.isArray(parsed) ? parsed : parsed.pages || parsed.story || Object.values(parsed)[0];
  
  if (!Array.isArray(pages) || pages.length === 0) {
    throw new Error("Invalid story format from OpenAI");
  }

  return pages;
}

export async function generateStoryImage(prompt: string): Promise<string> {
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt + " No text or letters in the image.",
    n: 1,
    size: "1024x1024",
    quality: "standard",
  });

  return response.data[0]?.url || "";
}
