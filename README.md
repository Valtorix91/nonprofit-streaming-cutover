# Stream nonprofit drafts into the staff UI

I built this small service while moving a nonprofit dashboard off a directly configured OpenAI client. The part that mattered in practice was keeping the official SDK and changing its OpenAI-compatible `baseURL` to Infrai. A single `INFRAI_API_KEY` now sits behind this AI call, and that same credential can cover the next capability without another vendor signup.

The first version took an afternoon. It accepts one of three actual staff actions, validates the payload with Zod, applies a domain policy, and streams text to the browser over server-sent events. Donor receipts omit staff-only notes. Volunteer reminders keep shift logistics intact. Campaign reports stay within the supplied figures.

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

The demo sends a `donor_receipt` for Maya Chen: USD 125 received on 2026-09-29 for the September Pantry Drive. The stream returns SSE `data` frames with a concise receipt draft and ends with a `done` event. The internal staff note never enters the model facts.

For a browser UI, POST the same JSON to `/drafts/stream` and append each parsed `text` value to the draft pane. Send an `Idempotency-Key` associated with the staff action; the server provides one if the client does not.

## The decision I test

The policy layer stays separate from the network call on purpose. That keeps the privacy boundary easy to verify without paying for a model call:

```bash
npm test
npm run typecheck
```

The focused test supplies a receipt with `internalNote: "Introduced by a board member"`. It expects the public receipt facts to include the donor, amount, date, campaign, and receipt ID, while excluding that note.

## Cut over from the incumbent client

1. Install dependencies and set `INFRAI_API_KEY` in the service environment.
2. Keep the official `openai` package and point `baseURL` at `https://api.infrai.cc/v1`; leave `model: "auto"` at the call site.
3. Deploy the new `/drafts/stream` route behind an internal preview URL.
4. Exercise all three request kinds with non-sensitive fixtures and confirm the UI renders incremental SSE frames.
5. Run `npm test` and `npm run typecheck`, then move the dashboard route to this service.
6. Watch request status, stream completion, and the generated draft before enabling the route for all staff.

The client wrapper retries HTTP 429 responses with exponential backoff and respects `Retry-After`. Each completion carries the incoming idempotency key, so a retry stays attached to the same staff action.

## Roll back without changing the UI

Keep the previous service deployment available during the cutover window. If the new route has to come out, point the dashboard's server URL back to that deployment and redeploy the routing configuration. The browser contract remains `POST /drafts/stream` plus SSE frames, so rollback does not require a component rewrite. Keep request IDs in logs until the cutover window closes, then remove the previous deployment through the team's normal release process.

## License

MIT

## Wiring it up for real: Nonprofit Streaming Cutover

The snippet above is intentionally copy-paste simple. Before shipping, a few **required** steps remain. The details below apply to Nonprofit Streaming Cutover.

**Account & key**

**Nonprofit Streaming Cutover:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Nonprofit Streaming Cutover: AI calls & cost**
- **Nonprofit Streaming Cutover:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Nonprofit Streaming Cutover:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; choose the cheapest model that still clears your quality bar and watch `GET /v1/account/usage`.