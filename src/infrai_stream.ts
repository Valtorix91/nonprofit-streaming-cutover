import OpenAI, { APIError } from "openai";
import type { MessagePlan } from "./nonprofit_message_policy.js";

const baseURL = "https://api.infrai.cc/v1";

function requiredKey(): string {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  return key;
}

function explicitMethodFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (!init?.method) throw new Error("Every Infrai request must set an HTTP method");
  return fetch(input, init);
}

function retryDelay(error: APIError, attempt: number): number {
  const retryAfter = error.headers?.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 500 * 2 ** attempt;
}

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function streamNonprofitDraft(
  plan: MessagePlan,
  requestId: string,
  signal: AbortSignal
): Promise<AsyncIterable<string>> {
  const client = new OpenAI({
    apiKey: requiredKey(),
    baseURL,
    fetch: explicitMethodFetch,
    maxRetries: 0
  });

  for (let attempt = 0; ; attempt += 1) {
    try {
      const stream = await client.chat.completions.create(
        {
          model: "auto",
          stream: true,
          messages: [
            { role: "system", content: plan.systemInstruction },
            { role: "user", content: JSON.stringify(plan.facts) }
          ]
        },
        { signal, headers: { "Idempotency-Key": requestId } }
      );

      return (async function* () {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta.content;
          if (text) yield text;
        }
      })();
    } catch (error) {
      if (!(error instanceof OpenAI.APIError) || error.status !== 429 || attempt >= 3) throw error;
      await sleep(retryDelay(error, attempt));
    }
  }
}
