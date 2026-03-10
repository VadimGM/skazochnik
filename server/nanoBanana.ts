import { log } from "./index";

const KIE_CREATE_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_QUERY_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";

const MAX_TASK_RETRIES = 3;
const POLL_ATTEMPTS_PER_TRY = 20;
const POLL_INTERVAL = 5000;
const STUCK_THRESHOLD = 12;

async function createTask(prompt: string, photoUrl: string, apiKey: string, pageIndex: number): Promise<string> {
  const payload = {
    model: "google/nano-banana-edit",
    input: {
      prompt: prompt,
      image_urls: [photoUrl],
      output_format: "png",
      image_size: "3:4",
    },
  };

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
  const taskId = createData.data?.taskId || createData.data?.task_id;

  if (!taskId) {
    log(`[NanoBanana] Стр.${pageIndex + 1}: ОШИБКА: taskId не найден. Ответ: ${createResText.substring(0, 500)}`, "nanoBanana");
    throw new Error(`No taskId in createTask response: ${createResText}`);
  }

  log(`[NanoBanana] Стр.${pageIndex + 1}: Задача создана: taskId="${taskId}"`, "nanoBanana");
  return taskId;
}

async function pollTask(taskId: string, apiKey: string, pageIndex: number, maxAttempts: number): Promise<{ status: "success"; url: string } | { status: "fail"; message: string } | { status: "timeout" }> {
  let waitingCount = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

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
        log(`[NanoBanana] Стр.${pageIndex + 1}: Попытка ${attempt}/${maxAttempts}: HTTP ${queryRes.status}`, "nanoBanana");
        continue;
      }

      const queryRaw = JSON.parse(queryResText);
      const taskData = queryRaw.data;
      const state = taskData?.state || "unknown";

      if (state === "waiting" || state === "queuing") {
        waitingCount++;
      } else {
        waitingCount = 0;
      }

      if (attempt % 5 === 1 || state === "success" || state === "fail") {
        log(`[NanoBanana] Стр.${pageIndex + 1}: Попытка ${attempt}/${maxAttempts}: state="${state}"`, "nanoBanana");
      }

      if (state === "success") {
        let imageUrl = "";
        if (taskData.resultJson) {
          try {
            const result = JSON.parse(taskData.resultJson);
            if (result.resultUrls && result.resultUrls.length > 0) {
              imageUrl = result.resultUrls[0];
            }
          } catch (e) {
            log(`[NanoBanana] Стр.${pageIndex + 1}: Ошибка парсинга resultJson`, "nanoBanana");
          }
        }

        if (imageUrl) {
          return { status: "success", url: imageUrl };
        }
        return { status: "fail", message: "Task succeeded but no image URL found" };
      }

      if (state === "fail") {
        const failMsg = taskData?.failMsg || "Unknown error";
        return { status: "fail", message: failMsg };
      }

      if (waitingCount >= STUCK_THRESHOLD) {
        log(`[NanoBanana] Стр.${pageIndex + 1}: Задача застряла в "${state}" ${waitingCount} попыток подряд — прерываю`, "nanoBanana");
        return { status: "timeout" };
      }

    } catch (err: any) {
      log(`[NanoBanana] Стр.${pageIndex + 1}: Попытка ${attempt}/${maxAttempts}: Ошибка поллинга: ${err.message}`, "nanoBanana");
    }
  }

  return { status: "timeout" };
}

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

  for (let retry = 1; retry <= MAX_TASK_RETRIES; retry++) {
    try {
      const taskId = await createTask(prompt, photoUrl, apiKey, pageIndex);
      log(`[NanoBanana] Стр.${pageIndex + 1}: Поллинг (попытка ${retry}/${MAX_TASK_RETRIES})...`, "nanoBanana");

      const result = await pollTask(taskId, apiKey, pageIndex, POLL_ATTEMPTS_PER_TRY);

      if (result.status === "success") {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        log(`[NanoBanana] Стр.${pageIndex + 1}: ГОТОВО за ${elapsed}с! URL: ${result.url.substring(0, 150)}`, "nanoBanana");
        return result.url;
      }

      if (result.status === "fail") {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        log(`[NanoBanana] Стр.${pageIndex + 1}: ЗАДАЧА ПРОВАЛЕНА после ${elapsed}с: ${result.message}`, "nanoBanana");
        if (retry < MAX_TASK_RETRIES) {
          log(`[NanoBanana] Стр.${pageIndex + 1}: Создаю новую задачу (попытка ${retry + 1}/${MAX_TASK_RETRIES})...`, "nanoBanana");
          continue;
        }
        throw new Error(`Nano Banana task failed after ${MAX_TASK_RETRIES} retries: ${result.message}`);
      }

      if (result.status === "timeout") {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        log(`[NanoBanana] Стр.${pageIndex + 1}: ТАЙМАУТ после ${elapsed}с`, "nanoBanana");
        if (retry < MAX_TASK_RETRIES) {
          log(`[NanoBanana] Стр.${pageIndex + 1}: Создаю новую задачу (попытка ${retry + 1}/${MAX_TASK_RETRIES})...`, "nanoBanana");
          continue;
        }
        throw new Error(`Nano Banana polling timeout after ${MAX_TASK_RETRIES} retries`);
      }
    } catch (err: any) {
      if (err.message.includes("after") && err.message.includes("retries")) {
        throw err;
      }
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      log(`[NanoBanana] Стр.${pageIndex + 1}: ОШИБКА (попытка ${retry}/${MAX_TASK_RETRIES}) после ${elapsed}с: ${err.message}`, "nanoBanana");
      if (retry >= MAX_TASK_RETRIES) {
        throw err;
      }
    }
  }

  throw new Error("Nano Banana: all retries exhausted");
}
