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

  if (!createRes.ok) {
    throw new Error(`KIE API createTask failed: HTTP ${createRes.status}`);
  }

  const createData = JSON.parse(createResText);
  const taskId = createData.data?.taskId || createData.data?.task_id;

  if (!taskId) {
    throw new Error(`No taskId in createTask response`);
  }

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

      if (state === "success") {
        let imageUrl = "";
        if (taskData.resultJson) {
          try {
            const result = JSON.parse(taskData.resultJson);
            if (result.resultUrls && result.resultUrls.length > 0) {
              imageUrl = result.resultUrls[0];
            }
          } catch (e) {}
        }

        if (imageUrl) {
          return { status: "success", url: imageUrl };
        }
        return { status: "fail", message: "No image URL found" };
      }

      if (state === "fail") {
        const failMsg = taskData?.failMsg || "Unknown error";
        return { status: "fail", message: failMsg };
      }

      if (waitingCount >= STUCK_THRESHOLD) {
        return { status: "timeout" };
      }

    } catch (err: any) {
      // Continue on poll error
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
    throw new Error("KIE_API_KEY is not set");
  }

  for (let retry = 1; retry <= MAX_TASK_RETRIES; retry++) {
    try {
      const taskId = await createTask(prompt, photoUrl, apiKey, pageIndex);
      const result = await pollTask(taskId, apiKey, pageIndex, POLL_ATTEMPTS_PER_TRY);

      if (result.status === "success") {
        return result.url;
      }

      if (result.status === "fail") {
        if (retry < MAX_TASK_RETRIES) {
          continue;
        }
        throw new Error(`Nano Banana task failed: ${result.message}`);
      }

      if (result.status === "timeout") {
        if (retry < MAX_TASK_RETRIES) {
          continue;
        }
        throw new Error(`Nano Banana polling timeout`);
      }
    } catch (err: any) {
      if (err.message.includes("failed") || err.message.includes("timeout")) {
        throw err;
      }
      if (retry >= MAX_TASK_RETRIES) {
        throw err;
      }
    }
  }

  throw new Error("Nano Banana: all retries exhausted");
}
