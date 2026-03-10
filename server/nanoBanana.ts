import { log } from "./index";

const KIE_CREATE_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_QUERY_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";

export async function generateIllustration(
  prompt: string,
  photoUrl: string,
  pageIndex: number
): Promise<string> {
  const startTime = Date.now();
  const apiKey = process.env.KIE_API_KEY;

  if (!apiKey) {
    log(`[NanoBanana] Стр.${pageIndex + 1}: ОШИБКА: KIE_API_KEY не задан`, "nanoBanana");
    throw new Error("KIE_API_KEY is not set");
  }

  log(`[NanoBanana] Стр.${pageIndex + 1}: Создаю задачу на редактирование фото`, "nanoBanana");
  log(`[NanoBanana] Стр.${pageIndex + 1}: Промпт (первые 300 символов): ${prompt.substring(0, 300)}...`, "nanoBanana");
  log(`[NanoBanana] Стр.${pageIndex + 1}: Исходное фото URL: ${photoUrl}`, "nanoBanana");

  const payload = {
    model: "google/nano-banana-edit",
    input: {
      prompt: prompt,
      image_urls: [photoUrl],
      output_format: "png",
      image_size: "3:4",
    },
  };

  let taskId: string;
  try {
    const createRes = await fetch(KIE_CREATE_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const createResText = await createRes.text();
    log(`[NanoBanana] Стр.${pageIndex + 1}: createTask HTTP статус: ${createRes.status}`, "nanoBanana");

    if (!createRes.ok) {
      throw new Error(`KIE API createTask failed: HTTP ${createRes.status} - ${createResText}`);
    }

    const createData = JSON.parse(createResText);
    taskId = createData.data?.taskId || createData.data?.task_id;

    if (!taskId) {
      log(`[NanoBanana] Стр.${pageIndex + 1}: ОШИБКА: taskId не найден. Ответ: ${createResText.substring(0, 500)}`, "nanoBanana");
      throw new Error(`No taskId in createTask response: ${createResText}`);
    }

    log(`[NanoBanana] Стр.${pageIndex + 1}: Задача создана: taskId="${taskId}"`, "nanoBanana");
  } catch (err: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`[NanoBanana] Стр.${pageIndex + 1}: ОШИБКА создания задачи после ${elapsed}с: ${err.message}`, "nanoBanana");
    throw err;
  }

  log(`[NanoBanana] Стр.${pageIndex + 1}: Начинаю поллинг статуса задачи "${taskId}"...`, "nanoBanana");
  const maxAttempts = 60;
  const pollInterval = 5000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    try {
      const queryUrl = `${KIE_QUERY_URL}?taskId=${taskId}`;
      const queryRes = await fetch(queryUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });

      const queryResText = await queryRes.text();

      if (!queryRes.ok) {
        log(`[NanoBanana] Стр.${pageIndex + 1}: Попытка ${attempt}/${maxAttempts}: HTTP ${queryRes.status}: ${queryResText.substring(0, 200)}`, "nanoBanana");
        continue;
      }

      const queryRaw = JSON.parse(queryResText);
      const taskData = queryRaw.data;
      const state = taskData?.state || "unknown";

      if (attempt % 5 === 1 || (state !== "generating" && state !== "waiting" && state !== "queuing")) {
        log(`[NanoBanana] Стр.${pageIndex + 1}: Попытка ${attempt}/${maxAttempts}: state="${state}"`, "nanoBanana");
      }

      if (state === "success") {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        let imageUrl = "";
        if (taskData.resultJson) {
          try {
            const result = JSON.parse(taskData.resultJson);
            if (result.resultUrls && result.resultUrls.length > 0) {
              imageUrl = result.resultUrls[0];
            }
          } catch (e) {
            log(`[NanoBanana] Стр.${pageIndex + 1}: Ошибка парсинга resultJson: ${taskData.resultJson}`, "nanoBanana");
          }
        }

        if (imageUrl) {
          log(`[NanoBanana] Стр.${pageIndex + 1}: ГОТОВО за ${elapsed}с! URL: ${imageUrl.substring(0, 150)}`, "nanoBanana");
          return imageUrl;
        }

        log(`[NanoBanana] Стр.${pageIndex + 1}: state=success но URL не найден. Ответ: ${queryResText.substring(0, 1000)}`, "nanoBanana");
        throw new Error(`Task succeeded but no image URL found`);
      }

      if (state === "fail") {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const failMsg = taskData?.failMsg || "Unknown error";
        log(`[NanoBanana] Стр.${pageIndex + 1}: ЗАДАЧА ПРОВАЛЕНА после ${elapsed}с: ${failMsg}`, "nanoBanana");
        throw new Error(`Nano Banana task failed: ${failMsg}`);
      }

    } catch (err: any) {
      if (err.message.includes("Task succeeded") || err.message.includes("task failed") || err.message.includes("Nano Banana task")) {
        throw err;
      }
      log(`[NanoBanana] Стр.${pageIndex + 1}: Попытка ${attempt}/${maxAttempts}: Ошибка поллинга: ${err.message}`, "nanoBanana");
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`[NanoBanana] Стр.${pageIndex + 1}: ТАЙМАУТ поллинга после ${elapsed}с (${maxAttempts} попыток)`, "nanoBanana");
  throw new Error(`Nano Banana polling timeout after ${maxAttempts} attempts`);
}
