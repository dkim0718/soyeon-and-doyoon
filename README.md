# Soyeon ♥ Doyoon — wedding site monorepo

Three wedding pages on separate subdomains plus an admin dashboard, all sharing
**one data backend** and **one photo set**. No build step, no framework: every
page is static HTML/CSS/JS that runs by opening it in a browser. A tiny Node
script vendors the shared code into each deploy root; that is the only "build".

---

## The three pages (and the admin)

| Dir       | URL (set in `shared/site-config.js`) | What it is | Linked from |
|-----------|--------------------------------------|------------|-------------|
| `invite/` | `soyeondoyoon.com` (own domain) | **청모파티 초대** — the invitation-party page. Single scrolling page: two full-bleed posters, date/venue, 안내사항, Our Story, 파티 순서, 오시는 길, Q&A, RSVP. | shared everywhere (KakaoTalk, etc.) |
| `kr/`     | `soyeondoyoon.fun`     | **Korean wedding website** — the full Joy-style multi-page site (welcome, story, schedule, travel, Q&A, gallery, RSVP). | its own URL (the apex); the EN site's **한국어** nav toggle |
| `en/`     | `soyeondoyoon.fun/en/` | **English afterparty invite** — same Joy engine, English content, curated-list RSVP with +1 allotments. | **nowhere** — unlisted (see below) |
| `admin/`  | private    | Dashboard: RSVP lists, guestbook moderation, content editor, afterparty guest-list import, JSON backup. | not public |

The invitation page deliberately sits on its **own domain** (not a path on the
website's domain) so invitation visitors stay isolated from website visitors —
separate Pages projects mean separate analytics, and trimming its URL leads
nowhere. The old `soyeondoyoon.fun/invite/` path 301-redirects to it
(`_redirects`), so pre-split shared links keep working.

**The invitation page links out only to the wedding site.** Its 결혼식 RSVP card
and its footer link to `soyeondoyoon.fun` (`links.weddingSite`); everything else
— posters, 안내사항, 순서, 지도, Q&A, and the party RSVP form — is self-contained.
The English page is the afterparty invitation and is reachable **only by its own
URL** — it is deliberately linked from nowhere. `SITE_URLS.en` exists so the page
knows its own address, but it is never rendered into any nav or button. Don't add
it to one.

> **History.** This page used to be the 모청 (모바일 청첩장). It was replaced by
> the 청모파티 invitation. The old engine still lives at `shared/mochung/` because
> the admin CSS is built on its stylesheet — its `main.js` is no longer loaded by
> any page. The old content override is still in the database under scope
> `invite`; the party page reads scope **`party`**, so that row is untouched and
> serves as a backup.

### Shared, not duplicated

Everything reused across pages lives in **`shared/`** — the single source of truth:

```
shared/
  site-config.js        the public site URLs
  supabase-config.js    backend keys (empty ⇒ localStorage fallback)
  store.js              adapter selector (façade)
  store.localStorage.js localStorage backend (local dev / demo)
  store.supabase.js     Supabase backend (production)
  i18n.js               ko/en copy for the Joy engine + RSVP widget
  rsvp-widget.js        the two RSVP flows (wedding + afterparty)
  app.js                the Joy engine (renders kr/ and en/)
  css/joy.css           Joy-style theme
  party/                the 청모파티 engine (main.js, style.css)
  mochung/              the retired 모청 engine — kept only for admin.css's base
  photos/               the one shared photo set (cover, gallery-01…30, og, …)

invite/  config.js       청모파티 content (PARTY_DEFAULTS)
kr/      content.ko.js   Korean wedding-site content
en/      content.en.js   English afterparty content
supabase/ README.md (setup guide), schema.sql, guest-list.template.csv
scripts/ assemble.mjs
```

Each page references shared code with relative `../shared/…` paths. Two contexts
resolve that path, and both end up at `/shared/…`:

- **Local dev** — served from the repo root, `…/invite/index.html` → `../shared/`
  → the repo's canonical `shared/`. **No assembly needed.**
- **Deploy** — each site is published as its own root, so `../shared/` clamps to
  `/shared/`. That folder only exists if `shared/` has been copied in beside the
  page. `scripts/assemble.mjs` does that copy (see [Deploying](#deploying)).

---

## Local development

Any static file server works. Serve the **repo root** so all four apps share one
origin (and therefore one `localStorage`, which makes the demo backend behave
like a shared database):

```bash
cd /path/to/withjoy-clone
python3 -m http.server 8000
```

Then open:

- <http://localhost:8000/invite/> — 청모파티 초대
- <http://localhost:8000/kr/> — Korean wedding site
- <http://localhost:8000/en/> — English afterparty invite
- <http://localhost:8000/admin/> — admin dashboard

Because everything is on `localhost:8000`, an RSVP submitted on `/en/` shows up
in `/admin/`, a guestbook message left on `/kr/` is visible from the 모청, and so
on — all via the browser's `localStorage`. (In production that same sharing is
done by Supabase instead; see below.) You do **not** need to run `assemble.mjs`
for local dev.

---

## The three RSVP flows

All three write through the same `Store` interface, so they work identically on
the localStorage fallback and on Supabase.

### 1. 청모파티 RSVP — invitation site

Open and submit-only. Tapping 참석 여부 & 메뉴 알리기 opens a bottom sheet on the
same page: 참석 여부, 성함, 메뉴 선택, 동반자 수·성함, 연락처, 남기실 말, plus any
**추가 질문** defined in the admin (stored in the `extra` JSONB column). One row
goes into `party_rsvps`. There is deliberately **no edit path** — the form says
수정이 불가하니 재전달해 주세요, matching the wedding form's behaviour.

### 2. Open wedding RSVP — KR site

Anyone can self-report. The KR site mounts the fields via `mountWeddingRsvp()`.
Fields: name, side (groom / bride), attending (yes / no), party size, phone,
message. Every submission is appended to `wedding_rsvps`. No guest list, no
gatekeeping — it's an open form. The invitation page's 결혼식 card links here.

### 3. Curated afterparty RSVP — EN site

The English page is invitation-only and enforces a per-guest **+1 allotment**:

1. **Identify.** A guest arrives via a personal link `…/en/?code=ABC123` (auto-
   identifies) or types their name. Lookup goes through a `SECURITY DEFINER` RPC
   that returns only that one guest's row — the full list is never downloadable.
2. **Respond.** They see a greeting, their allotment (`party_limit`), and a
   stepper capped at that number. Bringing guests reveals companion-name inputs.
3. **Submit / edit.** The response is upserted into `afterparty_rsvps` and stays
   editable — returning via the same link (or name) re-opens their answer. The
   allotment is enforced server-side; going over returns `OVER_LIMIT`.

The guest list itself (`afterparty_guests`) is pre-loaded by you in the admin —
see [Importing the afterparty guest list](#importing-the-afterparty-guest-list).

---

## Turning on Supabase (shared database)

With **no** keys set, everything runs on the `localStorage` adapter: data lives
on one device only — perfect for local preview, useless for a real guest list.
To get one shared database across all three subdomains:

1. Create a free project at <https://supabase.com>.
2. Open the **SQL editor** and run **`supabase/schema.sql`**. It creates the
   tables (`wedding_rsvps`, `afterparty_guests`, `afterparty_rsvps`,
   `guestbook`, per-site config), the guest-facing RPCs, and the Row-Level
   Security policies.
3. In **Project Settings → API**, copy the **Project URL** and the **anon
   public** key into `shared/supabase-config.js`:

   ```js
   window.SUPABASE_CONFIG = {
     url: 'https://YOUR-PROJECT.supabase.co',
     anonKey: 'eyJhbGci…',           // "anon public" key
     adminEmails: ['you@example.com'] // Supabase Auth allow-list (optional)
   };
   ```

The pages load the `supabase-js` client from a CDN **only when both `url` and
`anonKey` are set**, then `store.js` selects the Supabase adapter automatically;
otherwise it stays on localStorage. No code change is needed to switch.

**The anon key is safe to commit** in static JS. Row-Level Security (in
`schema.sql`) is the real gate: guests can submit an RSVP and look *themselves*
up through the RPCs, but nobody can download the guest list or read others'
responses. Admin reads/writes require Supabase Auth **and** membership in the
allow-list: after running the schema, `insert into public.admins(email) values
('you@example.com');` (the same address you put in `adminEmails`), and in
Supabase → Authentication → Providers → Email, turn **off** "Allow new users to
sign up". RLS checks the allow-list via `is_admin()`, so simply holding a
Supabase session is not enough.

> Prefer not to commit keys? `shared/supabase-config.js` is the file that's
> loaded, so add **that** file to your local `.gitignore` and keep your keyed
> copy out of git (or swap in the values only at deploy time).

---

## Importing the afterparty guest list

The English RSVP needs its curated list loaded first. In the admin, open
**`/admin/afterparty.html`** and upload a CSV.

**Columns** (only `display_name` is required):

| Column         | Required | Notes |
|----------------|----------|-------|
| `display_name` | yes | Guest's name as shown to them and matched on name lookup. |
| `invite_code`  |    | Token for the personal `?code=` link. Leave blank to let guests find themselves by name only. |
| `party_limit`  |    | Total seats incl. the guest (the "+N" allotment). Default `1`, max `20`. |
| `side`         |    | `groom` \| `bride` \| `both` (default `both`). |
| `locale`       |    | `en` \| `ko` (default `en`). |
| `group_label`  |    | Free-text grouping (e.g. "College friends") for your own filtering. |
| `notes`        |    | Private admin notes; never shown to guests. |

Import is an **upsert** keyed on `invite_code` (else normalized `display_name`),
so re-uploading a corrected CSV updates existing rows instead of duplicating.
`supabase/guest-list.template.csv` shows the exact header and a few sample rows.

**Per-guest links.** After import, the afterparty admin generates a shareable
link for each guest — `https://en.<your-domain>/?code=<invite_code>` — which
auto-identifies them so they never type a name. Copy/export those and send them
out privately (that URL is the *only* way anyone reaches the English page).

---

## Deploying

Host on **Cloudflare Pages** (Netlify/Vercel work the same way): **one project
per subdomain**, each pointed at the same repo but building a different site.

For each of `invite`, `kr`, `en` (and `admin` if you host it):

| Setting            | Value |
|--------------------|-------|
| Build command      | `node scripts/assemble.mjs <site>` |
| Build output dir   | `<site>` (e.g. `invite`) |
| Root directory     | repo root (leave default) |

`assemble.mjs` copies `shared/` into `<site>/shared`, so the published root gets
its own `/shared/…` and the `../shared/…` references resolve. Run
`node scripts/assemble.mjs all` locally to preview all four at once. The
assembled copies are gitignored — `shared/` at the repo root stays canonical.

Before the first deploy:

1. **Set the real URLs** in `shared/site-config.js` (`SITE_URLS.invite/kr/en`,
   no trailing slash). The admin's afterparty invite-link generator reads
   `SITE_URLS.en` from here.
2. **Point DNS** — one subdomain per project (`invite.`, `kr.`, `en.`).
3. **For the KakaoTalk share, set an absolute `og:image`.** Kakao (and
   every other scraper) can't use a relative image path. In `invite/config.js`
   set `share.imageUrl` to an absolute URL such as
   `https://invite.<your-domain>/shared/photos/og.jpg`, and add your Kakao
   JavaScript key (`share.kakaoJsKey`) with the domain registered at
   developers.kakao.com.

---

## Admin access

The admin is gated two ways depending on backend:

- **Demo / localStorage** — a client-side **passcode**, default **`1030`**, in
  `invite/config.js` (`PARTY_DEFAULTS.admin.passcode`). **Change it.** This is
  only obfuscation: the data lives in the visitor's own browser, so it's fine for
  the demo but is *not* real security.
- **Production / Supabase** — use **Supabase Auth**. Add the admin's email to
  `SUPABASE_CONFIG.adminEmails`; the dashboard signs in with a magic link and RLS
  enforces that only those accounts can read the full lists or moderate. Do not
  rely on the passcode once real guest data is in Supabase.

---

## Repo tooling reference

- **`scripts/assemble.mjs`** — `node scripts/assemble.mjs <invite|kr|en|admin|all>`.
  Node ESM, zero dependencies. Wipes and re-copies `shared/` into `<site>/shared`
  (idempotent), printing each file copied. Resolves paths from its own location,
  so it runs correctly from any working directory.
- **`.gitignore`** — ignores the assembled `*/shared/` copies,
  `shared/supabase-config.local.js`, and the usual OS/editor cruft. The canonical
  `shared/` stays tracked.
