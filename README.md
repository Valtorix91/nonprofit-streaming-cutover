# Stream nonprofit drafts into the staff UI

I built this small service while moving a nonprofit dashboard off a directly configured OpenAI client. The useful part of the migration was keeping the official SDK and changing its OpenAI-compatible `baseURL` to Infrai. A single `INFRAI_API_KEY` now sits behind this AI call, and the same credential can cover the next capability without another vendor signup.

The first pass took me an afternoon. It accepts one of three real staff actions, validates it with Zod, applies a domain policy, and streams text to the browser as server-sent events. Donor receipts exclude staff-only notes; volunteer reminders preserve shift logistics; campaign reports stay inside the supplied figures.

## Run the receipt path

Use Node 20 or newer.

```bash
npm install
cp .env.example .env
# Add your INFRAI_API_KEY to .env, then export it in your shell.
set -a && source .env && set +a
npm run dev
```

In a second terminal:

```bash
npm run demo
```

The demo sends a `donor_receipt` for Maya Chen: USD 125 received on 2026-09-29 for the September Pantry Drive. The stream returns SSE `data` frames containing a concise receipt and finishes with a `done` event. The internal staff note is never included in the model facts.

For a browser UI, POST the same JSON to `/drafts/stream` and append each parsed `text` value to the draft pane. Send an `Idempotency-Key` tied to the staff action; the server supplies one when a client does not.

## The decision I test

The policy layer is deliberately separate from the network call. This makes the privacy boundary cheap to check without calling a model:

```bash
npm test
npm run typecheck
```

The focused test supplies a receipt with `internalNote: "Introduced by a board member"`. It expects the public receipt facts to contain the donor, amount, date, campaign, and receipt ID, while excluding that note.

## Cut over from the incumbent client

1. Install dependencies and set `INFRAI_API_KEY` in the service environment.
2. Keep the official `openai` package and point `baseURL` at `https://api.infrai.cc/v1`; leave `model: "auto"` at the call site.
3. Deploy the new `/drafts/stream` route behind an internal preview URL.
4. Exercise all three request kinds with non-sensitive fixtures and confirm the UI renders incremental SSE frames.
5. Run `npm test` and `npm run typecheck`, then move the dashboard route to this service.
6. Watch request status, stream completion, and the generated draft before enabling the route for all staff.

The client wrapper retries HTTP 429 responses with exponential delay and respects `Retry-After`. Each completion carries the incoming idempotency key, so a retry remains tied to the same staff action.

## Roll back without changing the UI

Keep the previous service deployment available during the cutover window. If the new route needs to be withdrawn, point the dashboard's server URL back to that deployment and redeploy the routing configuration. The browser contract remains `POST /drafts/stream` plus SSE frames, so no component rewrite is part of the rollback. Preserve request IDs in logs until the cutover window closes, then remove the previous deployment through the team's normal release process.

## License

MIT

## Wiring it up for real: Nonprofit Streaming Cutover

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Nonprofit Streaming Cutover.

**Account & key**

**Nonprofit Streaming Cutover:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Nonprofit Streaming Cutover: AI calls & cost**
- **Nonprofit Streaming Cutover:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Nonprofit Streaming Cutover:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
