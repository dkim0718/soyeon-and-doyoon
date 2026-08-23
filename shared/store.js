/* =========================================================
 * Store — adapter selector (façade)
 * ---------------------------------------------------------
 * Picks the backend automatically:
 *   • If shared/store.supabase.js could initialise a client
 *     (valid SUPABASE_CONFIG + the supabase-js library present),
 *     it will have defined window.StoreSupabase → use it.
 *   • Otherwise fall back to the localStorage adapter — but ONLY
 *     when no Supabase keys are configured (local dev). When keys
 *     ARE configured and the client is still missing (the vendored
 *     library failed to load), localStorage would silently trap a
 *     guest's RSVP on their own device behind a fake success
 *     message. Instead we install a stub whose every method
 *     rejects, so forms surface a visible error and the guest
 *     retries after a refresh. Reads (config overrides) are
 *     try/catch-ed by the callers and fall back to file defaults,
 *     so the site itself still renders.
 *
 * Every page loads, in order:
 *   site-config.js, supabase-config.js,
 *   shared/vendor/supabase-js-v2.js (self-hosted),
 *   store.localStorage.js, store.supabase.js, store.js
 *
 * window.MochungStore is kept as an alias so the existing 모청
 * engine (shared/mochung/main.js) keeps working unchanged.
 * ========================================================= */
(function () {
  'use strict';
  var cfg = window.SUPABASE_CONFIG || {};
  var wantSupabase = !!(cfg.url && cfg.anonKey);
  var impl = window.StoreSupabase || window.StoreLocal;

  if (wantSupabase && !window.StoreSupabase && window.StoreLocal) {
    var down = { backend: 'unavailable' };
    Object.keys(window.StoreLocal).forEach(function (k) {
      if (typeof window.StoreLocal[k] !== 'function') return;
      down[k] = function () {
        return Promise.reject(new Error(
          '저장 서버에 연결하지 못했습니다. 새로고침 후 다시 시도해 주세요. ' +
          '(Could not reach the server — please refresh and try again.)'));
      };
    });
    impl = down;
    console.error('[Store] Supabase keys are configured but the client library did not load — refusing the localStorage fallback so nothing is saved to this device only.');
  }

  if (!impl) {
    console.error('[Store] no adapter available — did store.localStorage.js load?');
    return;
  }
  window.Store = impl;
  window.MochungStore = impl; // legacy alias for the 모청 engine
  try {
    console.info('[Store] backend =', impl.backend);
  } catch (e) { /* ignore */ }
})();
