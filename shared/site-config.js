/* =========================================================
 * Site URLs (shared across all pages)
 * ---------------------------------------------------------
 * The 모청 (the widely-shared mobile invitation; self-contained
 * — links to no other page) lives on ITS OWN apex domain, so
 * invitation traffic stays separate from the website's (one
 * Pages project, built by `npm run build:invite`).
 * Everything else public lives on soyeondoyoon.fun as paths
 * (one Pages project, built by `npm run build:root`):
 *   /         Korean site (default)
 *   /en/      English site — reachable via the nav language
 *             toggle on both sites
 *   /invite/  301 → the 모청 domain (_redirects; pre-split links)
 * The admin dashboard stays on its own private domain.
 * ========================================================= */
window.SITE_URLS = {
  invite: 'https://soyeondoyoon.com',           // 모청 (own domain; mass-shared with Korean guests)
  kr:     'https://soyeondoyoon.fun',           // Korean wedding website (apex)
  en:     'https://soyeondoyoon.fun/en',        // English site + afterparty RSVP (?code=…)
  admin:  'https://doremi.soyeondoyoon.cloud',  // Admin dashboard (private; never linked)
};
