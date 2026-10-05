import express from "express";
import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { nonprofitMessageSchema, planMessage } from "./nonprofit_message_policy.js";
import { streamNonprofitDraft } from "./infrai_stream.js";

const app = express();
app.use(express.json({ limit: "16kb" }));

app.post("/drafts/stream", async (request, response) => {
  const parsed = nonprofitMessageSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Invalid request body", issues: parsed.error.issues });
    return;
  }

  const requestId = request.header("Idempotency-Key") ?? randomUUID();
  const abortController = new AbortController();
  response.on("close", () => abortController.abort());

  try {
    const text = await streamNonprofitDraft(planMessage(parsed.data), requestId, abortController.signal);
    response.status(200);
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("X-Request-Id", requestId);
    response.flushHeaders();

    for await (const piece of text) {
      response.write(`data: ${JSON.stringify({ text: piece })}\n\n`);
    }
    response.write("event: done\ndata: {}\n\n");
    response.end();
  } catch (error) {
    if (abortController.signal.aborted) return;
    const upstreamStatus = error instanceof OpenAI.APIError ? error.status : undefined;
    const status = upstreamStatus && upstreamStatus >= 400 && upstreamStatus < 500
      ? upstreamStatus
      : 502;
    if (!response.headersSent) response.status(status).json({ error: "Draft request could not be completed" });
    else response.end();
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Nonprofit draft stream listening on http://localhost:${port}`));
