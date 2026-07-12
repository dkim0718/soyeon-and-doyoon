# Deploy — Cloudflare Pages

Everything is **static** (the only backend is Supabase, hosted separately), served from
Cloudflare Pages — free, on Cloudflare's global CDN (fast in Seoul *and* the US), automatic
HTTPS, and it shrugs off the invite-day traffic spike.

## Domain map (consolidated 2026-07-12)

The public pages live on **one domain as paths** — a single Pages project built by
`npm run build:root` (output dir `dist-root`): the Korean site at the root, English at
`/en/`, the 모청 at `/invite/`, one `shared/` beside them. A KR ⇄ EN toggle in the site
nav switches languages (it carries the current page across).

| What | URL | Cloudflare Pages project | Build command | Output dir |
|---|---|---|---|---|
| Korean site (default) | **soyeondoyoon.fun** | `soyeondoyoon-invite` (repurposed) | `npm run build:root` | `dist-root` |
| English site + afterparty RSVP | **soyeondoyoon.fun/en/** | ↑ same project | ↑ | ↑ |
| 모청 (mobile invitation) | **soyeondoyoon.fun/invite/** | ↑ same project | ↑ | ↑ |
| Admin (private) | **doremi.soyeondoyoon.cloud** | `soyeondoyoon-admin` | `npm run build:admin` | `admin` |

Both projects deploy from the **`main`** branch of `github.com/dkim0718/soyeon-and-doyoon`.
Retired: `kr.soyeondoyoon.com`, `suri.soyeondoyoon.fun`, and the `soyeondoyoon-kr` /
`soyeondoyoon-en` projects. **soyeondoyoon.com is deliberately EMPTY** (no site attached;
reserved for whatever comes later). The English page is no longer "unlisted" — it's linked
from the language toggle; the afterparty guest list itself stays protected by per-code
server-side lookups.

---

## Step 1 — Put the domains on Cloudflare (DNS)

For Pages custom domains (especially the apex `soyeondoyoon.com`), the cleanest path is to let
Cloudflare manage DNS:

1. Create a free account at **dash.cloudflare.com**.
2. **Add a site** → enter `soyeondoyoon.com`. Repeat for `soyeondoyoon.fun` and `soyeondoyoon.cloud`
   (three separate zones, all free).
3. Cloudflare shows you **two nameservers**. In **Hostinger** (where the domains are registered):
   Domains → each domain → DNS / Nameservers → **change nameservers** to the two Cloudflare ones.
4. Wait for Cloudflare to show each domain as **Active** (minutes to a few hours).

*(Once Pages custom domains are added in Step 3, Cloudflare creates the needed DNS records
automatically — including apex via CNAME flattening. You won't hand-edit records.)*

## Step 2 — Create the four Pages projects

For **each** row in the table above: Cloudflare dash → **Workers & Pages** → **Create** → **Pages**
→ **Connect to Git** → pick the `soyeon-and-doyoon` repo, then set:

- **Project name:** as in the table (e.g. `soyeondoyoon-invite`)
- **Production branch:** `main`
- **Framework preset:** None
- **Build command:** as in the table (e.g. `npm run build:invite`)
- **Build output directory:** the site folder (e.g. `invite`)
- **Root directory:** `/` (leave default)

Save & deploy. Each project builds and goes live on a temporary `*.pages.dev` URL first — open it
to confirm the site works before attaching the real domain.

## Step 3 — Attach the custom domains

In each project → **Custom domains** → **Set up a domain** → enter the domain from the table
(`soyeondoyoon.com` for invite, `kr.soyeondoyoon.com` for kr, etc.). Because the zones are on
Cloudflare, it wires the DNS for you and issues SSL automatically.

## Step 4 — Verify

- `https://soyeondoyoon.fun` → Korean site; nav **English** toggle → `/en/`, and back via **한국어**.
- `https://soyeondoyoon.fun/en/` → English site (afterparty RSVP by `?code=`).
- `https://soyeondoyoon.fun/invite/` → 모청; its **웨딩 홈페이지** button opens the apex.
- `https://doremi.soyeondoyoon.cloud` → admin (email magic-link sign-in).

To ship an update: `git push` to `main` → both projects rebuild automatically (~1 min).

---

## Status (2026-07-12)

- ✅ **Consolidated site live on soyeondoyoon.fun** (table above), auto-deploying from `main`.
  soyeondoyoon.com is empty by choice; kr./suri. subdomains removed. The idle
  `soyeondoyoon-kr` / `soyeondoyoon-en` projects can be deleted anytime (or kept as spares).
- ✅ **Supabase backend ON** — project `soyeondoyoon-wedding` (Seoul), schema + RLS applied,
  admin = magic-link for the allow-listed email. RSVPs/guestbook/edits are shared everywhere.
  Setup + guest-list guide: **`supabase/README.md`**.
- ✅ **Keep-alive** — `.github/workflows/supabase-keepalive.yml` pings the DB every 3 days so
  the free tier never pauses.

## Before the real launch (still open)

- **Real private data.** The committed `invite/config.js` uses **placeholders** for phone numbers,
  bank account and card-pay link (real values live in the gitignored `invite/config.private.js`).
  Before pasting them back and pushing: **make the GitHub repo private** (Cloudflare Pages keeps
  working; only the GitHub Pages staging mirror stops).
- **Kakao share.** For a rich KakaoTalk preview of the 모청, register `soyeondoyoon.fun` at
  developers.kakao.com and put the JavaScript key in `invite/config.js` → `share.kakaoJsKey`
  (`og:image` is already an absolute URL).
- **Afterparty guest list.** Fill `supabase/guest-list.template.csv` (Group A = `party_limit 2`,
  Group B = `1`), import via admin → 애프터파티 → 명단 가져오기, send out the per-guest links.
- **noindex.** All four pages carry `<meta name="robots" content="noindex">` so search engines skip
  them. Remove it from `invite/` and `kr/` only if you *want* the wedding site searchable (usually
  you don't).
