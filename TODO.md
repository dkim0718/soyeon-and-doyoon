# TODO

Working backlog for the wedding sites. Check items off (`[x]`) as they land;
add pointers/decisions under each item so any future session can pick it up
without re-investigating.

## 1. EN site: "kindly RSVP by September 15" popup

- [x] Done 2026-07-24 (not yet committed). On EN page load, a Joy-styled
      overlay asks guests to kindly RSVP by September 15 (deadline read from
      `rsvp.deadline` in `en/content.en.js`).
- How it landed: `maybeShowRsvpNudge()` in `shared/app.js`, gated on
  `rsvp.popup: true` (set only in EN content); strings in `shared/i18n.js`
  (`nudge.*`, en+ko); styles in `shared/css/joy.css` (`.nudge-*`).
- Behavior (mirrors the 모청 entry popup): shows 900ms after load on every
  visit; "RSVP now" → `#/rsvp`; "Don't show this again today" snoozes until
  midnight (`sd-rsvp-nudge-hideUntil`); ✕/backdrop/Esc just close; suppressed
  once this browser submits an afterparty RSVP (`sd-afterparty-responded`,
  set in `shared/rsvp-widget.js`) or when already on the RSVP page.
- Verified in browser 2026-07-24: popup, CTA routing, snooze, KR unaffected,
  no console errors.

## 2. KR site: 마음 전하실 곳 page (accounts in place of registry)

- [x] Done 2026-07-25. New `accounts` page on the KR site titled
      마음 전하실 곳: notice line + collapsible 신랑 측 / 신부 측 groups with
      bank/account rows, 계좌번호 복사 copy-to-clipboard, and optional
      카카오페이/카드결제 links — mirroring the 모청's accounts section.
- How it landed: `renderAccounts()`/`mountAccounts()` in `shared/app.js`,
  strings in `shared/i18n.js` (`accounts.*`), styles in `shared/css/joy.css`
  (`.acct-*`), data + nav entry in `kr/content.ko.js`. Data shape matches
  `invite/config.js` accounts, so real values transfer 1:1.
- ⚠️ Account numbers are PLACEHOLDERS (`0000000000000`), same scheme as the
  모청 — paste real values into `kr/content.ko.js` at launch (real values
  stashed in gitignored `invite/config.private.js`; repo should go private
  first, per DEPLOY.md).
- Not wired: admin edit-site.html editing for this block (edit the content
  file directly). Verified in browser 2026-07-25 (expand/collapse, copy,
  empty state, no console errors).

## 3. Visitor analytics (Cloudflare Web Analytics)

- [x] Enable **Cloudflare Web Analytics** for the public site (done 2026-08-24;
      note: the Metrics-tab toggle only takes effect on the NEXT deployment —
      an empty-commit rebuild activated the beacon injection) — visits, page
      views, referrers, and visitor countries; free, cookie-less (no consent
      banner needed).
- How: Cloudflare dash → Pages project `soyeondoyoon-invite` → enable Web
  Analytics (automatic beacon injection), **or** add the beacon `<script>`
  snippet to the `<head>` of `kr/index.html`, `en/index.html`,
  `invite/index.html`. One property covers all three pages (same Pages
  project); split by path `/` vs `/en/` vs `/invite/` in the dashboard.
- Also available with zero setup: zone-level traffic analytics on the
  `soyeondoyoon.fun` zone (Analytics & Logs) — but request-based and noisy
  (bots/assets). Hostinger offers nothing here (registrar only; nameservers
  are on Cloudflare).
- Decided (2026-07-24): country-level location is enough. If city-level is
  ever wanted, that means GA4 (consent banner) or Plausible (paid) instead.
- ⚠️ Counts only from enablement forward — enable well before the Sep 15
  RSVP deadline / invite-day spike.

## 4. KR site: nav labels 홈 → "Home", 자주 묻는 질문 → "FAQ"

- [x] Done 2026-08-13. In `kr/content.ko.js`: nav 홈 → **Home**. The qanda nav
      was already "Q & A" (not 자주 묻는 질문), so set BOTH the qanda nav label
      and `titles.qanda` to **FAQ** to keep tab == title (repo precedent,
      commits c6d9ab2, 46fe885). welcome page title stays empty → 홈 → Home is
      nav-only. Both new labels are ASCII, so they render in the 630i accent
      like Schedule/RSVP. The welcome-message prose "…자주 묻는 질문에 대한…" is
      intentionally left as-is (a sentence, not a label).

## 5. EN site: drop the "S & D" monogram at the top

- [x] Won't do — decided 2026-08-13 to KEEP the "S & D" monogram on the EN
      header. Closed by decision, not implemented. (If ever reversed: set
      `couple.monogram` to `""` in `en/content.en.js` — the engine then hides
      the monogram and shows the full "Soyeon & Doyoon" via the
      `.brand.no-monogram` path; the footer monogram disappears too.)

## 6. KR site: 소연 & 도윤 → "Soyeon & Doyoon" in titles

- [x] Done 2026-07-24 (not yet pushed). Switched the couple names to English in:
  - **On-page titles**: `partner1`, `partner2`, `displayName` in
    `kr/content.ko.js` (drives the welcome-page hero heading, the top-nav
    brand, and the dynamic `document.title` set in `shared/app.js`).
  - **Static tab title + link previews**: `<title>` and `og:title` in
    `kr/index.html`.
- Decided (2026-07-24): the `meta description` sentence and all story/Q&A
  prose (e.g. "또 다른 소연") **stay Korean** — don't touch those.

## 7. 모청 (+ KR/EN 웹사이트): admin 인라인 리치텍스트 편집기

- [x] **DONE (on `main`, 2026-08-13):** shipped as `shared/richtext.js` +
      `shared/richtext-editor.js`, wired into `admin/edit-site.html`; used for
      the hero/header + section per-word size/style editing on both sites.
      Original spec kept below for reference.
- In the admin, let part of a sentence be selected and resized with a
      slider (plus bold / 자간 / uppercase / capitalize). Motivating case:
      "김효종 · 주영실의 아들 도윤" — 의 smaller than 아들, names largest.
- Scope decided: that sentence lives only in the 모청 (`renderFamily()`,
  `shared/mochung/main.js:99-110`), so build there first — but put the widget
  in `shared/` and wire it into `admin/edit-site.html` in the same pass. KR
  and EN share one form path there (`SECTIONS` :133-150 → `fieldRow()` :161),
  so covering both is free; excluding EN would cost an extra conditional.
- How: two new plain-`<script>` files, no deps, no build change —
  `shared/richtext.js` (`RichText.sanitize()`: allowlist span/b/strong/em/i/br
  and a `style` limited to font-size / letter-spacing / font-weight /
  text-transform, each regex-validated; plus `RichText.toPlain()`), and
  `shared/richtext-editor.js` (a `contenteditable` div that hides the original
  input and mirrors sanitized HTML back into its `.value`). Both save handlers
  then stay untouched — they read `.value` (`edit.html:243`,
  `edit-site.html:185/232`). `scripts/assemble.mjs` copies all of `shared/`
  per site (:99, :147), so nothing there changes.
- 모청 render side: `shared/mochung/main.js:82` `el.textContent = v` →
  `el.innerHTML = RichText.sanitize(v)` for spans marked `data-rich` in
  `invite/index.html`, and split the hardcoded 의 out of `.rel` at
  `main.js:107` into `<span class="particle">의</span><span class="role">…`,
  styled next to `shared/mochung/style.css:189`. Load `shared/richtext.js` in
  `invite/index.html` (:298-311) before `main.js`.
- KR/EN engine needs NO change — all 19 admin-exposed fields already reach the
  DOM through unescaped `innerHTML` in `shared/app.js`, so markup renders today.
- ⚠️ Attach by allowlist, never blanket. Values reused as plain text break:
  모청 `wedding.venueName`/`address` (map URLs `main.js:248`, 주소 복사 `:259`,
  .ics `:538`), `venueTel`, account `bank`/`number`; KR/EN `travel[].body`
  (bullet+URL parser `app.js:270-287`), `qanda[].q` (`## ` sniff `:305`),
  `hotels[].stars` (`:253`). `couple.*.fullName` is split-personality —
  innerHTML in 연락하기 (`main.js:123/129`) but textContent in the 입장 팝업
  (`:382`); route the popup, `.ics` and Kakao share through `toPlain()`.
- ⚠️ `.rel` is `0.88em` (`style.css:189`), so a nested `em` multiplies — move
  the size onto `.particle`/`.role` and drop `.rel`'s left margin so 의 sits
  against 주영실 instead of floating 8px away.
- ⚠️ Saves are live to every visitor immediately (Supabase `config_overrides`
  → `main.js:570-571`), with no preview and no undo, and the `invite` scope is
  a full snapshot (`edit.html:238`) — sanitize on render, not only on save.
  While in there, fix the two stale notices: `admin/edit.html:29-30`
  (export-to-`config.js` is no longer required) and `admin/edit-site.html:84-88`
  ("편집한 기기에서만 보입니다" is false — its own status line at :280-281
  says the opposite).
- Sandoll (custom fonts, planned next) touches only `font-family`, a different
  CSS region — build this editor first. One real cross-constraint: a JS webfont
  loader that scans the DOM at load needs a re-scan call after the 모청's late
  `init()` render (`main.js:574-596`); and per-word **bold** requests a second
  font file/weight, which a font-count-limited plan may bill separately.
  ⚠️ Redo the Sandoll research from official sources (sandollcloud.com docs,
  이용약관, 1:1 문의) — the earlier automated pass was discarded for probing
  other sites' font credentials; do not reuse its specifics.

## 8. Admin: side-by-side live preview (edit form + real page)

- [x] **DONE — Tier A (on `main`, 2026-08-13):** `Admin.mountPreview` renders
      the real page in a side-by-side iframe in `admin/edit-site.html`. Tier B
      (debounced unsaved-state postMessage preview) remains optional / not done.
      Original spec kept below for reference.
- Show the real page next to the edit form in `admin/edit-site.html`
      (EN/KR 사이트) and `admin/edit.html` (모청), instead of the current
      new-tab 미리보기 ↗ round trip.
- Prereq (LANDED 2026-08-04, verify committed): the 미리보기 링크 fix in
  `admin/admin.js` (`siteUrl`/`wireSiteLinks`, hostname-branched). The admin is
  its own publish root on doremi.soyeondoyoon.cloud, so `../invite/`, `../en/`,
  `../kr/` clamped to the admin domain, where `scripts/assemble.mjs:109-124`
  vendors only config/content files and no index.html. `Admin.siteUrl()` is
  also the correct iframe `src` in both environments (relative locally,
  absolute `SITE_URLS` in prod).
- Tier A (do this): `<iframe src=Admin.siteUrl(site)>` in a sticky pane,
  re-assign `frame.src` with a `?t=` cache-buster after save (cross-origin ⇒
  no `contentWindow.reload()`). Zero engine changes. 모청 is 1:1 at 480px
  (`shared/mochung/style.css:77`); the Joy site needs `transform:scale()` in a
  wrapper because `joy.css:20` is 46rem wide and its only breakpoint is 560px.
  Device-width toggle: 390 / 820 / 1280.
- Tier B (later): debounced postMessage of unsaved form state. `shared/app.js`
  needs 4 edits (clearInterval above the guard at :492, `route(opts)` no-scroll
  mode, hoist the chrome block :869-888, add `repaint()`). `shared/mochung/
  main.js` needs a real ~250-350-line refactor — its render fns ARE its binders,
  so a 2nd `renderAccounts` double-binds `.acc-head` (:302) and kills the
  accordion, and `initRsvp`/`initGuestbook` (:357/:429) double-write to Store.
- ⚠️ Tier B ships a message receiver to the **public, mass-shared** pages.
  Gate on `?preview=1` + `window.parent !== window` (the `?design=1` idiom at
  `app.js:575`), allowlist `event.origin` by strict `===` against
  `new URL(SITE_URLS.admin).origin` (not startsWith), keep it in-memory only
  (never write `sd-design` — `kr/index.html:31-40` reads it pre-paint), and add
  `_headers` with `frame-ancestors` (none exist in the repo today).
- ⚠️ On the localStorage backend the cross-origin admin and site don't share
  storage, so the preview shows the plain site until Supabase is configured —
  check `window.Store.backend` and say so in the UI.
- Click-to-edit (converges with the rich-text editor, entry 7): 모청 is nearly
  free — `invite/index.html` already has 17 `data-bind` paths matching
  `admin/edit.html`'s `data-cfg` 1:1. The Joy site has none; every renderer in
  `shared/app.js:415-427` must emit `data-cfg`, list sections by map index, and
  `admin/edit-site.html:178,203` must stamp the same path (re-stamp in
  `renumber()` at :217).
- Two live bugs found while scoping (independent of preview, worth a quick fix):
  `main.js:312-315` — the `$('#rsvp').hidden` branch has no `else`, so the RSVP
  on/off checkbox is one-way; `app.js:492-493` — `clearInterval` sits below the
  `if (!el) return` guard, leaking the countdown interval.

## 9. KR site: hero photo "feels instant" (blur-up placeholder + AVIF)

- [ ] Make the home hero photo *appear* faster without lowering desktop quality.
      Parked 2026-08-13 — the site "feels okay for now" per the user; this is the
      polish pass, not urgent.
- Context: the load-time **resize jump** is already fixed (commit c6e6d2b —
  `aspect-ratio: 3/2` on `.hero-img` reserves the box height, so the frame no
  longer grows 186px when the photo loads). What's left is that the big
  `shared/photos/hero.jpg` (3200×2133, ~1.1MB) still takes a beat to arrive, so
  the reserved frame sits empty until it does.
- Two-part plan (deferred earlier as "Fix 3 / #2"):
  1. **Blur-up placeholder** — inline a tiny (~30px-wide) heavily-blurred version
     as a base64 data-URI in the CSS/markup (a couple KB, ships with the page =
     0 extra requests), shown scaled-up + CSS-blurred inside the now-fixed 3:2
     frame; cross-fade the full image in on `img.onload`. Fills the empty frame
     instantly, then sharpens. The admin already canvas-downscales uploads
     (`Admin.uploadPhoto`), so it could emit the LQIP at upload time and store it
     alongside the hero URL in the `media` scope.
  2. **AVIF via `<picture>`** — serve AVIF (or WebP) with a JPEG fallback; AVIF at
     high quality is ~½ the bytes of a visually-identical JPEG, so the
     full-quality photo downloads ~2× faster with no visible desktop change.
     Pair with `<link rel="preload" as="image" fetchpriority="high">` (the
     `<img>` already has `fetchpriority="high"`, added in renderWelcome).
- Explicitly NOT doing: re-encoding hero.jpg at lower quality — the user rejected
  that (visible on desktop). These techniques keep full quality.
