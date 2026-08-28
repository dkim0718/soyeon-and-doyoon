# Deploy — Cloudflare Pages

Everything is **static** (the only backend is Supabase, hosted separately), served from
Cloudflare Pages — free, on Cloudflare's global CDN (fast in Seoul *and* the US), automatic
HTTPS, and it shrugs off the invite-day traffic spike.

## Domain map (모청 split off 2026-07-27 · 청모파티 전환 2026-08-28)

The **청모파티 초대 페이지 lives on its own apex domain** so invitation traffic stays fully
separate from the website's (its own Pages project, `npm run build:invite`). This domain
used to serve the 모청 (모바일 청첩장); it was replaced by the 청모파티 invitation on
2026-08-28. The page is self-contained apart from links out to the wedding site
(`links.weddingSite`) for the 결혼식 RSVP. The rest of the public
pages live on **soyeondoyoon.fun as paths** — a single Pages project built by
`npm run build:root` (output dir `dist-root`): the Korean site at the root, English at
`/en/`, one `shared/` beside them. A KR ⇄ EN toggle in the site nav switches languages
(it carries the current page across). The pre-split `/invite/` path 301-redirects to the
모청's domain (`_redirects`), so links shared before the split keep working.

| What | URL | Cloudflare Pages project | Build command | Output dir |
|---|---|---|---|---|
| 청모파티 초대 (was: 모청) | **soyeondoyoon.com** | `soyeondoyoon-mochung` | `npm run build:invite` | `invite` |
| Korean site (default) | **soyeondoyoon.fun** | `soyeondoyoon-invite` (repurposed) | `npm run build:root` | `dist-root` |
| English site + afterparty RSVP | **soyeondoyoon.fun/en/** | ↑ same project | ↑ | ↑ |
| Admin (private) | **doremi.soyeondoyoon.cloud** | `soyeondoyoon-admin` | `npm run build:admin` | `admin` |

All projects deploy from the **`main`** branch of `github.com/dkim0718/soyeon-and-doyoon`.
Retired: `kr.soyeondoyoon.com`, `suri.soyeondoyoon.fun`, and the `soyeondoyoon-kr` /
`soyeondoyoon-en` projects. **soyeondoyoon.com now hosts the 청모파티 초대 페이지** (it sat empty/reserved
until the split, then served the 모청 until 2026-08-28). The English page is no longer "unlisted" — it's linked
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
(`soyeondoyoon.com` for the invitation project, `soyeondoyoon.fun` for the consolidated site,
`doremi.soyeondoyoon.cloud` for admin). Because the zones are on
Cloudflare, it wires the DNS for you and issues SSL automatically.

## Step 4 — Verify

- `https://soyeondoyoon.com` → 청모파티 초대 (posters → 안내사항 → Story → 순서 → 오시는 길 → Q&A → RSVP).
  Check: the menu appears once you scroll past the first poster and hides again at the top;
  the 청모파티 RSVP submits; the 결혼식 card and footer link out to soyeondoyoon.fun.
- `https://soyeondoyoon.fun` → Korean site; nav **English** toggle → `/en/`, and back via **한국어**.
- `https://soyeondoyoon.fun/en/` → English site (afterparty RSVP by `?code=`).
- `https://soyeondoyoon.fun/invite/` → 301 to `https://soyeondoyoon.com` (pre-split links).
- `https://doremi.soyeondoyoon.cloud` → admin (email magic-link sign-in).
  **Hard-refresh once after any deploy that changes `admin/admin.js`** — a cached copy of the
  old file against fresh HTML breaks the editor (it calls `Admin.mergedPartyConfig`).

To ship an update: `git push` to `main` → all projects rebuild automatically (~1 min).

---

## Status (2026-07-12)

- ✅ **Consolidated site live on soyeondoyoon.fun** (table above), auto-deploying from `main`.
  kr./suri. subdomains removed. The idle
  `soyeondoyoon-kr` / `soyeondoyoon-en` projects can be deleted anytime (or kept as spares).
- ✅ **soyeondoyoon.com live** — `soyeondoyoon-mochung` project + custom domain done.
- ✅ **청모파티 전환 (2026-08-28)** — the 모청 was replaced by the 청모파티 invitation.
  New engine `shared/party/`, content in `invite/config.js` (`PARTY_DEFAULTS`), admin editor
  at `admin/edit.html`, responses at `admin/party-rsvp.html`. The page's config override uses
  the **`party`** scope; the old 모청 override is still in the `invite` row as a backup.
  `supabase/party-rsvps.sql` (the `party_rsvps` table) was applied on 2026-08-28.
- ✅ **Supabase backend ON** — project `soyeondoyoon-wedding` (Seoul), schema + RLS applied,
  admin = magic-link for the allow-listed email. RSVPs/guestbook/edits are shared everywhere.
  Setup + guest-list guide: **`supabase/README.md`**.
- ✅ **Keep-alive** — `.github/workflows/supabase-keepalive.yml` pings the DB every 3 days so
  the free tier never pauses.

## Before the real launch (still open)

- **청모파티 placeholder content — still on the live page.** `invite/config.js` marks these
  with `TBD` comments and all are editable in the admin: the 5:30 PM start time, the dinner
  room label, the 메뉴 선택지 (currently `메뉴 A / 메뉴 B / 채식` — the RSVP is only as useful
  as these), the 몇 시까지 가면 되나요 answer, and **the two poster images** (still the wedding
  photos; the real posters carry their own text, so they drop straight in).
- **KakaoTalk link preview.** The preview title/description/image are the `og:` tags near the
  top of `invite/index.html`. They are read by scrapers, so they are **not** editable from the
  admin — changing them is a code edit + deploy. `og:image` is an absolute URL and currently
  points at the wedding `og.jpg`; swap it for a poster.
- **Testing a change before it goes public.** Push a branch instead of `main`; Cloudflare builds
  a preview per project at `https://<branch>.<project>.pages.dev` (e.g.
  `party-invitation.soyeondoyoon-mochung.pages.dev`). Note it writes to the **live** Supabase,
  so a test RSVP is a real row — delete it afterwards.
- **Afterparty guest list.** Fill `supabase/guest-list.template.csv` (Group A = `party_limit 2`,
  Group B = `1`), import via admin → 애프터파티 → 명단 가져오기, send out the per-guest links.
- **noindex.** All four pages carry `<meta name="robots" content="noindex">` so search engines skip
  them. Remove it from `invite/` and `kr/` only if you *want* the wedding site searchable (usually
  you don't).
