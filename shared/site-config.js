/* =========================================================
 * Site URLs (shared across all pages)
 * ---------------------------------------------------------
 * The 청모파티 invitation (widely shared; self-contained except
 * for its link out to the wedding site) lives on ITS OWN apex
 * domain, so invitation traffic stays separate from the website's
 * (one Pages project, built by `npm run build:invite`).
 * Everything else public lives on soyeondoyoon.fun as paths
 * (one Pages project, built by `npm run build:root`):
 *   /         Korean site (default)
 *   /en/      English site — reachable via the nav language
 *             toggle on both sites
 *   /invite/  301 → the invitation domain (_redirects; pre-split links)
 * The admin dashboard stays on its own private domain.
 * ========================================================= */
window.SITE_URLS = {
  invite: 'https://soyeondoyoon.com',           // 청모파티 초대 (own domain; mass-shared with Korean guests)
  kr:     'https://soyeondoyoon.fun',           // Korean wedding website (apex)
  en:     'https://soyeondoyoon.fun/en',        // English site + afterparty RSVP (?code=…)
  admin:  'https://doremi.soyeondoyoon.cloud',  // Admin dashboard (private; never linked)
};
