/* =========================================================
 * Site URLs (shared across all pages)
 * ---------------------------------------------------------
 * Everything public lives on ONE domain as paths (one
 * Cloudflare Pages project, built by `npm run build:root`):
 *   /         Korean site (default)
 *   /en/      English site — reachable via the nav language
 *             toggle on both sites
 *   /invite/  모청 (the widely-shared mobile invitation;
 *             its 웨딩 홈페이지 button points at SITE_URLS.kr)
 * The admin dashboard stays on its own private domain.
 * soyeondoyoon.com is intentionally EMPTY (reserved).
 * ========================================================= */
window.SITE_URLS = {
  invite: 'https://soyeondoyoon.fun/invite',    // 모청 (mass-shared with Korean guests)
  kr:     'https://soyeondoyoon.fun',           // Korean wedding website (apex)
  en:     'https://soyeondoyoon.fun/en',        // English site + afterparty RSVP (?code=…)
  admin:  'https://doremi.soyeondoyoon.cloud',  // Admin dashboard (private; never linked)
};
