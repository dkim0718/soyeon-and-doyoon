# TODO

Working backlog for the wedding sites. Check items off (`[x]`) as they land;
add pointers/decisions under each item so any future session can pick it up
without re-investigating.

## 1. EN site: "kindly RSVP by September 15" popup

- [ ] On page load of the EN afterparty site, show a JavaScript overlay (like
      the 모청's RSVP overlay — **not** a browser window/alert) kindly asking
      guests to RSVP by **September 15**.
- Pointers: the 모청 overlay pattern lives in `shared/mochung/` (main.js +
  style.css); EN page content is `en/content.en.js`, engine is `shared/app.js`.
- Decide when implementing: show once per visitor (localStorage flag) vs. every
  visit; suppress for guests who have already RSVP'd.

## 2. KR site: 마음 전하실 곳 page (accounts in place of registry)

- [ ] Add a page titled **마음 전하실 곳** to the KR site — a registry-style
      page, but instead of a registry it shows the bank account numbers guests
      can send money to, much like the 모청's accounts section.
- Pointers: the 모청's accounts section (data in `invite/config.js`
  `MOCHUNG_DEFAULTS`, rendering in `shared/mochung/main.js`) is the model.
  KR pages/nav are defined in `kr/content.ko.js`; the Joy engine
  (`shared/app.js`) renders them. Note: a registry section was previously
  hidden (commit 1d51143) — this replaces it in spirit.

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

## 4. KR site: 소연 & 도윤 → "Soyeon & Doyoon" in titles

- [x] Done 2026-07-24 (not yet pushed). Switched the couple names to English in:
  - **On-page titles**: `partner1`, `partner2`, `displayName` in
    `kr/content.ko.js` (drives the welcome-page hero heading, the top-nav
    brand, and the dynamic `document.title` set in `shared/app.js`).
  - **Static tab title + link previews**: `<title>` and `og:title` in
    `kr/index.html`.
- Decided (2026-07-24): the `meta description` sentence and all story/Q&A
  prose (e.g. "또 다른 소연") **stay Korean** — don't touch those.
