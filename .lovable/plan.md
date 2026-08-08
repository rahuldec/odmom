# Get the MOM API live

The endpoint code already exists and is complete — it just isn't live in production yet. This plan does only what's needed to make your other portal able to pull MOM data.

## Steps

1. **Verify the endpoint on preview** — call `/api/public/moms` on the preview build to confirm it returns rows (auth check, GET filters, JSON shape) instead of a 404.
2. **Publish the app** so the endpoint goes live at the production URL.
3. **Confirm production** — re-check the live URL responds (401 without a key, data with the key).
4. **Hand over the integration details** in chat: URL, auth header, query params, and the exact JSON response shape so you can wire the other portal.

No data cleanup, no docs page, no form changes in this pass.

## Technical details

- Route: `src/routes/api/public/moms.ts` (TanStack server route, already written).
- Auth: `x-api-key` header (or `Authorization: Bearer …`) compared against the `MOM_API_KEY` secret, constant-time.
- `GET /api/public/moms?limit=50&client=&from=&to=` — returns `{ data: [...] }`, newest meeting date first, limit capped at 200.
- `POST /api/public/moms` — Zod-validated body, returns `{ data }` with 201.
- CORS is open (`*`) with an `OPTIONS` preflight handler, so a browser-side portal can call it too.
- Live URL after publish: `https://odmom.lovable.app/api/public/moms`.

## Note

Anything reading this API needs the `MOM_API_KEY` value. It was generated write-only, so it can't be read back. If you need to paste it into the other portal, say so and I'll swap in a key you generate yourself (`openssl rand -hex 32`) — kept distinct from any KPI feed key.
