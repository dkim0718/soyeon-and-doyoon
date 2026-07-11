/* =========================================================
 * Site URLs (shared across all three pages)
 * ---------------------------------------------------------
 * The three landing pages live on separate subdomains.
 * Put your real URLs here (no trailing slash). Until you have
 * a domain, the placeholders below work for local dev — the
 * 모청 "웨딩 홈페이지" button just points at SITE_URLS.kr.
 *
 * IMPORTANT: the English site (en) is intentionally NOT linked
 * from anywhere. It is reachable only by its own URL. Do not
 * add SITE_URLS.en to any nav/button.
 * ========================================================= */
window.SITE_URLS = {
  invite: 'https://soyeondoyoon.com',          // 모청 (widely shared; links to kr)
  kr:     'https://kr.soyeondoyoon.com',        // Korean wedding website (linked from 모청)
  en:     'https://suri.soyeondoyoon.fun',      // English / afterparty (unlisted; different TLD)
  admin:  'https://doremi.soyeondoyoon.cloud',  // Admin dashboard (private; reference only — not linked)
};
