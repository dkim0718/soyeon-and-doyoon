# Deploy — Cloudflare Pages (4 subdomains)

The three wedding pages + admin are **static** (the only backend is Supabase, hosted separately).
So each one is served as its own Cloudflare Pages project — free, on Cloudflare's global CDN
(fast in Seoul *and* the US), automatic HTTPS, and it shrugs off the invite-day traffic spike.

## Domain map

| Page | Cloudflare Pages project | Custom domain | Build command | Output dir |
|---|---|---|---|---|
| 모청 (mobile invitation) | `soyeondoyoon-invite` | **soyeondoyoon.com** (apex) | `npm run build:invite` | `invite` |
| Korean wedding site | `soyeondoyoon-kr` | **kr.soyeondoyoon.com** | `npm run build:kr` | `kr` |
| English / afterparty (unlisted) | `soyeondoyoon-en` | **suri.soyeondoyoon.fun** | `npm run build:en` | `en` |
| Admin (private) | `soyeondoyoon-admin` | **doremi.soyeondoyoon.cloud** | `npm run build:admin` | `admin` |

All four deploy from the **`main`** branch of `github.com/dkim0718/soyeon-and-doyoon`.
(Each build just runs `node scripts/assemble.mjs <site>`, which copies `shared/` into the site
folder so its `../shared/...` links resolve when that folder is the site root.)

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

- `https://soyeondoyoon.com` → 모청; its **웨딩 홈페이지** button opens `https://kr.soyeondoyoon.com`.
- `https://kr.soyeondoyoon.com` → Korean site.
- `https://suri.soyeondoyoon.fun` → English/afterparty (RSVP by `?code=`; unlisted — linked from nowhere).
- `https://doremi.soyeondoyoon.cloud` → admin (passcode `000000` on the current localStorage backend).

To ship an update: `git push` to `main` → all four projects rebuild automatically (~1 min).

---

## Before the real launch

- **Real private data.** The committed `invite/config.js` uses **placeholders** for phone numbers,
  bank account, card-pay link and the admin passcode (the real values are in the gitignored
  `invite/config.private.js`). Paste them back into `invite/config.js` and push when you're ready
  for real guests. Change the admin passcode from `000000` too.
- **noindex.** All four pages carry `<meta name="robots" content="noindex">` so search engines skip
  them. Remove it from `invite/` and `kr/` only if you *want* the wedding site searchable (usually
  you don't).
- **Turn on the shared backend (Supabase).** Until then, RSVPs and admin edits are per-browser.
  Create a free project → run `supabase/schema.sql` → `insert into public.admins(email)…` and turn
  off Auth sign-ups → paste the URL + anon key into `shared/supabase-config.js` → push. Then RSVPs +
  website edits are shared with everyone across all four subdomains.
- **Keep Supabase awake.** The free tier pauses after ~7 days of no DB activity (which would break
  the RSVP form). For the ~1–2 months around the wedding, upgrade to Supabase **Pro ($25/mo)** or add
  a scheduled GitHub Action that pings the DB every few days (ask and I'll add it).
- **Kakao share.** For a rich KakaoTalk preview of the 모청, register `soyeondoyoon.com` at
  developers.kakao.com and put the JavaScript key in `invite/config.js` → `share.kakaoJsKey`
  (`og:image` is already an absolute URL).
