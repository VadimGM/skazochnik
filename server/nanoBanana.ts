import { log } from "./index";

const KIE_API_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_QUERY_URL = "https://api.kie.ai/api/v1/jobs/queryTask";

interface NanoBananaEditRequest {
  prompt: string;
  imageUrl: string;
  outputFormat?: "png" | "jpeg";
  imageSize?: string;
}

interface TaskResponse {
  taskId: string;
  status?: string;
}

interface TaskResult {
  status: string;
  output?: {
    images?: Array<{ url: string }>;
    image_url?: string;
    result?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export async function generateIllustration(
  prompt: string,
  photoUrl: string,
  pageIndex: number
): Promise<string> {
  const startTime = Date.now();
  const apiKey = process.env.KIE_API_KEY;

  if (!apiKey) {
    log(`[NanoBanana] ОШИБКА: KIE_API_KEY не задан`, "nanoBanana");
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

  log(`[NanoBanana] Стр.${pageIndex + 1}: Отправляю POST запрос к ${KIE_API_URL}`, "nanoBanana");
  log(`[NanoBanana] Стр.${pageIndex + 1}: Payload: ${JSON.stringify(payload).substring(0, 500)}`, "nanoBanana");

  let taskId: string;
  try {
    const createRes = await fetch(KIE_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const createResText = await createRes.text();
    log(`[NanoBanana] Стр.${pageIndex + 1}: createTask HTTP статус: ${createRes.status}`, "nanoBanana");
    log(`[NanoBanana] Стр.${pageIndex + 1}: createTask ответ: ${createResText.substring(0, 500)}`, "nanoBanana");

    if (!createRes.ok) {
      throw new Error(`KIE API createTask failed: HTTP ${createRes.status} - ${createResText}`);
    }

    const createData = JSON.parse(createResText);
    taskId = createData.taskId || createData.task_id || createData.id;

    if (!taskId) {
      log(`[NanoBanana] Стр.${pageIndex + 1}: ОШИБКА: taskId не найден в ответе. Ключи: [${Object.keys(createData).join(", ")}]`, "nanoBanana");
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

      const queryData = JSON.parse(queryResText);
      const status = queryData.status || queryData.state || "unknown";

      if (attempt % 5 === 1 || status !== "processing") {
        log(`[NanoBanana] Стр.${pageIndex + 1}: Попытка ${attempt}/${maxAttempts}: status="${status}"`, "nanoBanana");
      }

      if (status === "completed" || status === "success" || status === "COMPLETED" || status === "SUCCESS") {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        let imageUrl = "";
        if (queryData.output?.images?.[0]?.url) {
          imageUrl = queryData.output.images[0].url;
        } else if (queryData.output?.image_url) {
          imageUrl = queryData.output.image_url;
        } else if (queryData.output?.result) {
          imageUrl = queryData.output.result;
        } else if (queryData.result?.images?.[0]?.url) {
          imageUrl = queryData.result.images[0].url;
        } else if (queryData.result?.image_url) {
          imageUrl = queryData.result.image_url;
        } else if (queryData.image_url) {
          imageUrl = queryData.image_url;
        } else if (queryData.result) {
          if (typeof queryData.result === "string" && queryData.result.startsWith("http")) {
            imageUrl = queryData.result;
          }
        }

        if (imageUrl) {
          log(`[NanoBanana] Стр.${pageIndex + 1}: ГОТОВО за ${elapsed}с! URL: ${imageUrl.substring(0, 100)}...`, "nanoBanana");
          return imageUrl;
        }

        log(`[NanoBanana] Стр.${pageIndex + 1}: status=completed но URL не найден. Полный ответ: ${queryResText.substring(0, 1000)}`, "nanoBanana");
        throw new Error(`Task completed but no image URL found. Response: ${queryResText.substring(0, 500)}`);
      }

      if (status === "failed" || status === "error" || status === "FAILED" || status === "ERROR") {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        log(`[NanoBanana] Стр.${pageIndex + 1}: ЗАДАЧА ПРОВАЛЕНА после ${elapsed}с. Полный ответ: ${queryResText.substring(0, 500)}`, "nanoBanana");
        throw new Error(`Nano Banana task failed: ${queryResText.substring(0, 300)}`);
      }

    } catch (err: any) {
      if (err.message.includes("Task completed") || err.message.includes("task failed") || err.message.includes("Nano Banana task")) {
        throw err;
      }
      log(`[NanoBanana] Стр.${pageIndex + 1}: Попытка ${attempt}/${maxAttempts}: Ошибка поллинга: ${err.message}`, "nanoBanana");
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`[NanoBanana] Стр.${pageIndex + 1}: ТАЙМАУТ поллинга после ${elapsed}с (${maxAttempts} попыток)`, "nanoBanana");
  throw new Error(`Nano Banana polling timeout after ${maxAttempts} attempts`);
}
