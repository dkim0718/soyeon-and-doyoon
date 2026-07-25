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

- [ ] Enable **Cloudflare Web Analytics** for the public site — visits, page
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

- [ ] In the KR nav (`navigation` in `kr/content.ko.js`), change the label
      홈 to **Home** and 자주 묻는 질문 to **FAQ**.
- Per repo precedent (commits c6d9ab2, 46fe885: page title matches its nav
  tab), also change `titles.qanda` from 자주 묻는 질문 to "FAQ". The welcome
  page title is empty, so 홈 → Home touches only the nav label.

## 5. EN site: drop the "S & D" monogram at the top

- [ ] Remove the "S & D" shown above the site name in the EN header — set
      `couple.monogram` to `""` in `en/content.en.js`. The engine then hides
      the monogram element and shows the full "Soyeon & Doyoon" as the brand
      instead (`.brand.no-monogram` path in `shared/app.js` boot), same as
      the KR site. The footer monogram disappears automatically too.

## 6. KR site: 소연 & 도윤 → "Soyeon & Doyoon" in titles

- [x] Done 2026-07-24 (not yet pushed). Switched the couple names to English in:
  - **On-page titles**: `partner1`, `partner2`, `displayName` in
    `kr/content.ko.js` (drives the welcome-page hero heading, the top-nav
    brand, and the dynamic `document.title` set in `shared/app.js`).
  - **Static tab title + link previews**: `<title>` and `og:title` in
    `kr/index.html`.
- Decided (2026-07-24): the `meta description` sentence and all story/Q&A
  prose (e.g. "또 다른 소연") **stay Korean** — don't touch those.
