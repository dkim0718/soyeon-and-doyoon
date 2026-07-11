/* =========================================================
 * Store — adapter selector (façade)
 * ---------------------------------------------------------
 * Picks the backend automatically:
 *   • If shared/store.supabase.js could initialise a client
 *     (valid SUPABASE_CONFIG + the supabase-js library present),
 *     it will have defined window.StoreSupabase → use it.
 *   • Otherwise fall back to the localStorage adapter.
 *
 * Every page loads, in order:
 *   site-config.js, supabase-config.js,
 *   [supabase-js CDN — only when keys are set],
 *   store.localStorage.js, store.supabase.js, store.js
 *
 * window.MochungStore is kept as an alias so the existing 모청
 * engine (shared/mochung/main.js) keeps working unchanged.
 * ========================================================= */
(function () {
  'use strict';
  var impl = window.StoreSupabase || window.StoreLocal;
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
