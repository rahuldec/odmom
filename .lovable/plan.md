# Push data into the MOM Portal — make the API usable

Three things: get the API live, give you a copy-paste way to push and pull data, and clean up the client names so the data is worth pushing.

## 1. Publish so the API actually answers

Right now `GET https://odmom.lovable.app/api/public/moms` returns the app's HTML with a 404 — the published build predates the API route. Nothing external can call it until the site is republished. This is the first step.

## 2. A ready-made way to push data

Add an **API** page inside the portal (linked from the top bar, alongside Dashboard and Meetings) that shows:

- The endpoint URL and the `x-api-key` header requirement
- A copy button for a working `POST` curl example with a filled-in sample body
- A copy button for a working `GET` curl example with the query options (`limit`, `client`, `from`, `to`)
- The full field reference: which fields are required, allowed values for `meeting_type` and `pending_with`, and the shape of each nested array
- A note that the key is stored as `MOM_API_KEY` and is never displayed

The key value itself is not rendered anywhere on the page. You paste it into your other system yourself.

No change to the endpoint's behaviour — it already validates and inserts correctly.

## 3. Stop new spelling variants at the source

Two small form changes so pushed and typed data converge on the same names:

- **Trim on save** — `client_name` currently stores trailing spaces exactly as typed. Six of the 64 distinct names differ by nothing but whitespace or casing.
- **Suggest existing names** — the Client field offers the names already in the system as you type. Still free text, so nothing is blocked; it just makes the existing spelling the path of least resistance.

## 4. Clean up the 76 existing records

I'll present the merge list for your line-by-line approval before any data changes. Proposed merges, from the current data:

| Keep | Merge in | Visits |
|---|---|---|
| Hindu Vidyapeeth | Hindu Vidhyapeeth, Hindu Vidyapeeth (trailing space) | 3 + 3 + 2 |
| Hindu College of Engineering | Hindi College of Engineering, Hindu Engineering college | 1 + 1 |
| Aravali College of Engineering and Management | 4 casing/spacing variants | 5 total |
| Hindu College of Pharmacy | trailing-space duplicate | 2 |
| Hindu Kanya | trailing-space duplicate | 2 |
| Cambridge World School | Cambridge World School, Kurukshetra | 1 + 1 |

Needs your call, not mine:

- `SM Hindu` / `S.M Hindu Senior Secondary` / `SM Hindu Sabzi Mandi` — same institute or different branches?
- Rows naming two institutes at once: `Hindu Vidyapeeth and Hindu Kanya`, `SM Hindu Senior Secondary School and Hindu Senior Secondary School` — split into two records, or pick a primary?
- Bare abbreviations `GNAV`, `SCR`, `RKSD`, `SDGI`, `MAIMT`, `IAMR In`, `Budha` — tell me the full names and I'll expand them.
- One row with client name `test` — delete it?

## Technical notes

- `src/routes/api/public/moms.ts` needs no code change; it just needs a deploy.
- New route `src/routes/api-docs.tsx` for the docs page, linked from `src/components/app-shell.tsx`.
- `src/components/mom-form.tsx`: trim `client_name` before submit; add a `datalist` of distinct existing names fed by a new lightweight server function in `src/lib/mom.functions.ts`.
- Data cleanup runs as `UPDATE` statements against `moms` after you approve the merge list — reversible only by hand, so approval comes first.
