# FiberMaxxing Kitchen

The public recipe site: real cooks submit recipes, a human reviews them, and the
fibre and protein numbers are computed from USDA FoodData Central rather than
typed in by the submitter.

```
Instagram post  →  /recipes/[slug]  →  /submit  →  admin review  →  published
                                                          ↓
                                             1080×1350 share card
```

Visitor accounts do not exist. Submissions are anonymous; the review queue is
unlocked with one shared moderator key.

This app is intentionally **not** wired to the Flutter app in `../app`. The app
keeps using the FatSecret proxy. The schema and `recipe.get`-style JSON are
shaped so a read-only bridge can be added later without touching the app.

---

## Architecture

| Concern | Where it lives |
| --- | --- |
| Recipe text, foods, portions, moderation | Cloudflare **D1** (SQLite) |
| Dish photos | Cloudflare **R2**, converted to WebP by `sharp` |
| Next.js hosting | **Vercel** |
| Local development | `web/.data/kitchen.db` (Node's built-in SQLite) |

Vercel cannot hold a D1 binding and its filesystem is read-only, so the deployed
app talks to D1 through Cloudflare's HTTP API and to R2 through the S3 API.
Every query is written against the SQLite dialect, so local and production share
one code path (`lib/db/index.ts`). No Postgres, no account tables.

---

## Run it locally

```bash
cd web
npm install
cp .env.example .env.local     # then set ADMIN_KEY and, optionally, FDC_API_KEY

npm run db:init                # creates web/.data/kitchen.db
npm run seed                   # 1,400+ USDA foods (recipes arrive via submissions)
npm run dev -- -p 3000
```

With no `CF_*` or `R2_*` variables the site runs entirely locally: SQLite for
data, `web/public/uploads` for photos. Moderator key in this checkout:
`local-moderator-key-2026` (from `.env.local`) at `/admin`.

Useful scripts:

```bash
npm run db:init      # apply the SQLite schema to D1 or the local file
npm run seed:foods   # rebuild seed/foods.json + seed/nutrients.json from ../data/usda
npm run seed         # load foods, full nutrient panels and portions
npm run typecheck
npm test
npm run build
```

---

## How the nutrition is calculated

1. **The cook picks an amount and a unit separately** (`2` + `cup`), then
   chooses a food from the catalog.
2. **Weight units convert exactly** (`oz`, `lb`, `g`, `kg`).
3. **Volume and count units only convert through a USDA portion row.** The
   catalog stores things like `1 cup rolled oats = 156 g`, so a cup of lentils
   is 198 g and a cup of spinach is 30 g — never the same density. If USDA has
   no measured weight for a unit, that unit is not offered for that food.
4. **Everything is summed by weight and divided by servings** on the server
   (`lib/nutrition/compute.ts`). Client values are for the live preview only.
5. **Tags are derived from the result**: `high_fiber` ≥ 8 g/serving,
   `high_protein` ≥ 25 g/serving.

The recipe page's unit toggle shows metric (`g`, `ml`) or US units. Weight
ingredients switch to **measured cups** when USDA publishes a cup weight for
that food, and fall back to ounces when it does not, so the toggle never invents
a density.

### USDA caching

The catalog is built from the USDA CSV dumps in `../data/usda` by
`scripts/build-seed.ts` (~1,400 foods selected by a curated common-ingredient
allowlist). Every food stores the full per-100 g panel — all 149 nutrient ids
USDA publishes (230 distinct keys once Foundation is included), not just the
seven macro columns — in `food_nutrients.nutrients`, keyed by
`lib/nutrition/nutrients.ts` and labelled by `seed/nutrients.json`. Foods USDA
does not carry (psyllium husk, kangaroo) live in `seed/supplements.json` with
their source recorded.

At runtime, `/api/foods/search` searches that cache first. Only when
fewer than three results come back does it call FoodData Central with
`FDC_API_KEY`, and every live result (plus its portions and whatever nutrients
the API returned) is written into D1 before the response is returned — unless a
fuller seeded panel already exists for that food. A repeated search is therefore a pure database
read, and the API is never called twice for the same food.

Without `FDC_API_KEY` the search silently stays on the local catalog; that is a
supported state, not an error.

---

## Photos

A photo of the finished dish is **required** to submit.

1. The browser posts the original file to `POST /api/upload` (JPEG/PNG/WebP,
   ≤ 10 MB).
2. `lib/upload.ts` reads the magic bytes, computes the SHA-256 of the original
   (kept for takedown evidence), then `sharp` rotates, resizes to ≤ 1600 px,
   encodes **WebP at quality 78** and strips EXIF/GPS.
3. With R2 credentials the WebP is written to
   `recipes/<year>/<sha-prefix>/<sha16>-<random>.webp` through the S3 API and the
   public URL is stored on the recipe row in D1. Without a public bucket domain
   the URL is `/api/images/...`, which streams the object from R2.
4. Without R2 credentials and outside Vercel, the same WebP is written to
   `public/uploads` so local development behaves identically.

Only URLs this app wrote are accepted by the submission action; a client cannot
submit an arbitrary image address.

---

## Submission and moderation

- Guest submissions, no account, no login wall.
- Draft is saved to `localStorage` on every change and restored on reload.
- Every submission gets a private `/status/[token]` link.
- Rate limits: 3 submissions/hour and 20/day per IP hash; 20 uploads/hour.
- Turnstile is enforced when `TURNSTILE_SECRET_KEY` is set, and skipped in
  development otherwise.

The **publish gate** refuses to publish unless every ingredient is mapped or
marked negligible, there are ≥ 2 ingredients, ≥ 1 step, nutrition is computed,
and the photo has its originality attestation. That is enforced in
`lib/nutrition/recompute.ts` and checked again in `reviewRecipe`.

Moderation lives behind `/admin` and one `ADMIN_KEY`. The cookie only carries an
HMAC of the key, so rotating the env var invalidates every session. Admin pages:
`/admin` (queue), `/admin/foods`, `/admin/reports`, `/admin/dmca`.

---

## Deploy (Vercel)

1. **D1**: create a database, then an API token with *D1: Edit*.
2. **R2**: create a bucket, then an R2 API token with *Object Read & Write*.
   Attach a custom domain (or use the `r2.dev` URL) and put it in
   `R2_PUBLIC_BASE_URL`.
3. Import the repo into Vercel with **Root Directory** = `web`.
4. Set the variables from `.env.example`: `CF_ACCOUNT_ID`,
   `CF_D1_DATABASE_ID`, `CF_D1_API_TOKEN`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`, `ADMIN_KEY`,
   `NEXT_PUBLIC_SITE_URL`, `DMCA_AGENT_EMAIL`, `ACCOUNT_DELETION_EMAIL`,
   `NEXT_PUBLIC_PLAY_STORE_URL`, plus `TURNSTILE_*` and `FDC_API_KEY` when you
   have them.
5. Run `npm run db:init && npm run seed` once against the same variables
   (locally, or as a one-off job).
6. Deploy.

The uploaded WebP never touches Vercel: the browser sends it to the Next route,
which streams the converted bytes to R2.

---

## Copyright

- The upload step requires an attestation stored with the submission.
- `/dmca` is a working notice form (all statutory elements, including the
  good-faith and accuracy statements) plus a counter-notice route.
- A notice that resolves to a recipe unpublishes it **immediately**.
- Two valid strikes end submission privileges (`infringement_strikes`).
- `DMCA_AGENT_EMAIL` must be a real monitored inbox before launch. Register the
  agent with the U.S. Copyright Office (~$6, renewed every 3 years) if you want
  the §512 safe harbour.

## Account deletion

`/account-deletion` is the public URL to give Google Play for the data-deletion
policy. It sends people to **Profile → Delete account** in the app and explains
what is removed, what is retained and how subscriptions work. Set
`ACCOUNT_DELETION_EMAIL` to a monitored inbox before publishing; the default is
`slothdevwork@gmail.com`. The in-app path calls the `deleteAccount` Cloud
Function, which recursively deletes `users/{uid}` and the Auth account.

**Do not seed this site with FatSecret recipes.** Their terms allow a 24-hour
cache, not republication. `seed/recipes.ts` is intentionally empty, so seeding
refreshes the food catalog only; add recipes there only if you own the rights
to them.

---

## Verified

```bash
npm run typecheck     # clean
npm test              # units, portions, per-serving maths, thresholds
npm run build         # all routes build
```

Exercised end to end locally on SQLite: photo upload → WebP conversion →
submission → moderator unlock → publish gate → published recipe page → metric/cup
toggle.

Not verified in this environment: the D1 HTTP path and R2 writes (no Cloudflare
credentials are present), live USDA lookups (`FDC_API_KEY` is empty), and a
Vercel deployment. Those code paths are written but need real credentials for a
first-run check.
