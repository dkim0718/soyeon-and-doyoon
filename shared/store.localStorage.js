/* =========================================================
 * Store — localStorage adapter (fallback / local dev)
 * ---------------------------------------------------------
 * Implements the shared data interface used by all three
 * pages + admin. Data lives in THIS browser only, so it is
 * for local preview/demo. For real cross-subdomain sharing,
 * configure Supabase (see shared/supabase-config.js) — the
 * Supabase adapter implements this exact same interface.
 *
 * Tables (localStorage keys):
 *   wedding_rsvps      — open self-report RSVP (모청 + KR site)
 *   afterparty_guests  — pre-loaded curated invite list (EN site)
 *   afterparty_rsvps   — responses to the afterparty invite
 *   guestbook          — 축하 메시지
 *   config.override.*  — per-site admin edits ('invite'|'kr'|'en')
 * ========================================================= */
window.StoreLocal = (function () {
  'use strict';

  const NS = 'mochung.';
  const KEYS = {
    wedding: NS + 'wedding_rsvps',
    apGuests: NS + 'afterparty_guests',
    apRsvps: NS + 'afterparty_rsvps',
    guestbook: NS + 'guestbook',
    config: NS + 'config.override.',   // + scope
    adminSession: NS + 'admin.session',
  };

  /* ---------- helpers ---------- */

  function uid() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function readList(key) {
    try {
      const raw = localStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function writeList(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
  }

  function normName(s) {
    return String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function str(v, max) {
    const s = String(v == null ? '' : v).trim();
    return max ? s.slice(0, max) : s;
  }

  function toInt(v, def) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : def;
  }

  // SHA-256 (https/localhost). Falls back to a weak hash on file://.
  async function hashText(text) {
    const msg = 'mochung::' + text;
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < msg.length; i++) {
      const ch = msg.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 'weak-' + (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
  }

  /* =======================================================
   * Wedding RSVP (open self-report) — 모청 + KR site
   * ===================================================== */

  async function submitWeddingRsvp(data) {
    const entry = {
      id: uid(),
      name: str(data.name, 40),
      side: data.side === 'bride' ? 'bride' : 'groom',
      attending: data.attending === false ? false : true,
      party_count: Math.max(0, toInt(data.partyCount, 1)),
      phone: str(data.phone, 30),
      companion: str(data.companion, 120),
      meal: str(data.meal, 20),
      bus: str(data.bus, 20),
      message: str(data.message, 500),
      locale: data.locale === 'en' ? 'en' : 'ko',
      created_at: Date.now(),
    };
    const list = readList(KEYS.wedding);
    list.push(entry);
    writeList(KEYS.wedding, list);
    return entry;
  }

  // Legacy shim: the 모청 (main.js) still calls MochungStore.addRsvp(...)
  async function addRsvp(data) {
    return submitWeddingRsvp({
      name: data.name,
      side: data.side,
      attending: true,
      partyCount: data.count,
      phone: data.phone,
      companion: data.companion,
      meal: data.meal,
      bus: data.bus,
      message: '',
      locale: 'ko',
    });
  }

  async function listWeddingRsvps(filter) {
    filter = filter || {};
    let list = readList(KEYS.wedding).sort((a, b) => b.created_at - a.created_at);
    if (filter.side) list = list.filter((r) => r.side === filter.side);
    if (filter.locale) list = list.filter((r) => r.locale === filter.locale);
    return list;
  }
  // Legacy alias (barunson admin used listRsvps)
  async function listRsvps() { return listWeddingRsvps(); }

  async function deleteWeddingRsvp(id) {
    writeList(KEYS.wedding, readList(KEYS.wedding).filter((e) => e.id !== id));
  }
  async function deleteRsvp(id) { return deleteWeddingRsvp(id); }

  /* =======================================================
   * Afterparty (curated invite list + allotments) — EN site
   * ===================================================== */

  // Admin: bulk import the pre-loaded invite list.
  // rows: [{ display_name, invite_code?, side?, locale?, party_limit?, group_label?, notes? }]
  async function importAfterpartyGuests(rows) {
    const guests = readList(KEYS.apGuests);
    const byCode = new Map(guests.filter((g) => g.invite_code).map((g) => [g.invite_code, g]));
    const byName = new Map(guests.map((g) => [g.name_norm, g]));
    let inserted = 0, updated = 0, skipped = 0;
    const errors = [];
    (rows || []).forEach((row, i) => {
      const display_name = str(row.display_name, 80);
      if (!display_name) { skipped++; errors.push('row ' + (i + 1) + ': missing display_name'); return; }
      const code = str(row.invite_code, 40) || null;
      const rec = {
        display_name: display_name,
        name_norm: normName(display_name),
        invite_code: code,
        side: ['groom', 'bride', 'both'].includes(row.side) ? row.side : 'both',
        locale: row.locale === 'ko' ? 'ko' : 'en',
        party_limit: Math.min(20, Math.max(1, toInt(row.party_limit, 1))),
        group_label: str(row.group_label, 60),
        notes: str(row.notes, 200),
      };
      // A row WITH a code is identified by its code only (so two guests who
      // share a name but have different codes both import). A codeless row
      // falls back to matching by normalized name.
      const existing = code ? byCode.get(code) : byName.get(rec.name_norm);
      if (existing) {
        Object.assign(existing, rec, { id: existing.id, created_at: existing.created_at });
        updated++;
      } else {
        const g = Object.assign({ id: uid(), created_at: Date.now() }, rec);
        guests.push(g);
        if (code) byCode.set(code, g);
        byName.set(g.name_norm, g);
        inserted++;
      }
    });
    writeList(KEYS.apGuests, guests);
    return { inserted, updated, skipped, errors };
  }

  async function listAfterpartyGuests() {
    return readList(KEYS.apGuests).slice().sort((a, b) =>
      a.display_name.localeCompare(b.display_name));
  }

  async function deleteAfterpartyGuest(id) {
    writeList(KEYS.apGuests, readList(KEYS.apGuests).filter((g) => g.id !== id));
    writeList(KEYS.apRsvps, readList(KEYS.apRsvps).filter((r) => r.guest_id !== id));
  }

  function findGuest({ code, name }) {
    const guests = readList(KEYS.apGuests);
    if (code) {
      const c = str(code).toUpperCase();
      const byCode = guests.find((g) => (g.invite_code || '').toUpperCase() === c);
      if (byCode) return byCode;
    }
    if (name) {
      const n = normName(name);
      const matches = guests.filter((g) => g.name_norm === n);
      if (matches.length === 1) return matches[0];
      if (matches.length > 1) return { _ambiguous: true, count: matches.length };
    }
    return null;
  }

  // Public: a guest looks up their own invitation. Returns minimal fields.
  async function lookupAfterpartyGuest({ code, name }) {
    const g = findGuest({ code, name });
    if (!g) return null;
    if (g._ambiguous) return { ambiguous: true, count: g.count };
    const rsvp = readList(KEYS.apRsvps).find((r) => r.guest_id === g.id) || null;
    return {
      guest: {
        id: g.id,
        display_name: g.display_name,
        side: g.side,
        locale: g.locale,
        party_limit: g.party_limit,
        invite_code: g.invite_code,
        group_label: g.group_label,
      },
      rsvp: rsvp,
    };
  }

  // Public: submit/update an afterparty RSVP. Enforces the allotment.
  async function submitAfterpartyRsvp(data) {
    const g = findGuest({ code: data.code, name: data.name });
    if (!g) { const e = new Error('GUEST_NOT_FOUND'); e.code = 'GUEST_NOT_FOUND'; throw e; }
    if (g._ambiguous) { const e = new Error('AMBIGUOUS'); e.code = 'AMBIGUOUS'; throw e; }

    const attending = data.attending === false ? false : true;
    let partyCount = Math.max(1, toInt(data.partyCount, 1));
    if (attending && partyCount > g.party_limit) {
      const e = new Error('OVER_LIMIT'); e.code = 'OVER_LIMIT'; e.limit = g.party_limit; throw e;
    }
    if (!attending) partyCount = 0;
    const companions = (Array.isArray(data.companions) ? data.companions : [])
      .map((c) => str(c, 80)).filter(Boolean).slice(0, Math.max(0, g.party_limit - 1));

    const rsvps = readList(KEYS.apRsvps);
    let row = rsvps.find((r) => r.guest_id === g.id);
    const now = Date.now();
    if (!row) {
      row = { id: uid(), guest_id: g.id, created_at: now };
      rsvps.push(row);
    }
    Object.assign(row, {
      attending: attending,
      party_count: partyCount,
      companions: companions,
      contact_email: str(data.contactEmail, 120),
      contact_phone: str(data.contactPhone, 30),
      message: str(data.message, 500),
      locale: data.locale === 'ko' ? 'ko' : 'en',
      updated_at: now,
    });
    writeList(KEYS.apRsvps, rsvps);
    return row;
  }

  // Admin: joined view of the invite list + responses.
  async function listAfterpartyRsvps() {
    const rsvps = readList(KEYS.apRsvps);
    const byGuest = new Map(rsvps.map((r) => [r.guest_id, r]));
    const guests = await listAfterpartyGuests();
    return guests.map((g) => ({
      guest: g,
      rsvp: byGuest.get(g.id) || null,
    }));
  }

  async function deleteAfterpartyRsvp(id) {
    writeList(KEYS.apRsvps, readList(KEYS.apRsvps).filter((r) => r.id !== id));
  }

  /* =======================================================
   * Guestbook (방명록)
   * ===================================================== */

  async function listGuestbook(filter) {
    filter = filter || {};
    let list = readList(KEYS.guestbook).sort((a, b) => b.createdAt - a.createdAt);
    if (filter.locale) list = list.filter((e) => (e.locale || 'ko') === filter.locale);
    return list;
  }

  async function addGuestbook({ name, message, password, locale }) {
    const entry = {
      id: uid(),
      name: str(name, 20),
      message: str(message, 200),
      passwordHash: await hashText(String(password)),
      locale: locale === 'en' ? 'en' : 'ko',
      createdAt: Date.now(),
    };
    const list = readList(KEYS.guestbook);
    list.push(entry);
    writeList(KEYS.guestbook, list);
    return entry;
  }

  async function deleteGuestbook(id, { password, admin } = {}) {
    const list = readList(KEYS.guestbook);
    const idx = list.findIndex((e) => e.id === id);
    if (idx < 0) throw new Error('메시지를 찾을 수 없습니다.');
    if (!admin) {
      const hash = await hashText(String(password || ''));
      if (hash !== list[idx].passwordHash) throw new Error('비밀번호가 일치하지 않습니다.');
    }
    list.splice(idx, 1);
    writeList(KEYS.guestbook, list);
  }

  /* =======================================================
   * Config override (per site: 'invite' | 'kr' | 'en')
   * ===================================================== */

  async function getConfigOverride(scope) {
    try {
      const raw = localStorage.getItem(KEYS.config + (scope || 'invite'));
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  async function saveConfigOverride(scope, obj) {
    // Back-compat: barunson admin called saveConfigOverride(obj) with one arg.
    if (obj === undefined && scope && typeof scope === 'object') { obj = scope; scope = 'invite'; }
    localStorage.setItem(KEYS.config + (scope || 'invite'), JSON.stringify(obj));
  }
  async function clearConfigOverride(scope) {
    localStorage.removeItem(KEYS.config + (scope || 'invite'));
  }

  /* =======================================================
   * Admin auth (demo passcode). Real auth = Supabase adapter.
   * ===================================================== */

  function adminPasscode() {
    const c = window.MOCHUNG_DEFAULTS && window.MOCHUNG_DEFAULTS.admin && window.MOCHUNG_DEFAULTS.admin.passcode;
    return c || '1030';
  }
  async function adminSignIn(secret) {
    const ok = String(secret) === String(adminPasscode());
    if (ok) { try { sessionStorage.setItem(KEYS.adminSession, '1'); } catch (e) { /* ignore */ } }
    return ok;
  }
  async function adminSignOut() {
    try { sessionStorage.removeItem(KEYS.adminSession); } catch (e) { /* ignore */ }
  }
  async function isAdmin() {
    try { return sessionStorage.getItem(KEYS.adminSession) === '1'; } catch (e) { return false; }
  }

  /* =======================================================
   * Backup
   * ===================================================== */

  async function exportAll() {
    return {
      exportedAt: new Date().toISOString(),
      backend: 'localStorage',
      wedding_rsvps: readList(KEYS.wedding),
      afterparty_guests: readList(KEYS.apGuests),
      afterparty_rsvps: readList(KEYS.apRsvps),
      guestbook: readList(KEYS.guestbook),
      configOverride: {
        invite: await getConfigOverride('invite'),
        kr: await getConfigOverride('kr'),
        en: await getConfigOverride('en'),
      },
    };
  }

  async function importAll(data) {
    if (!data || typeof data !== 'object') throw new Error('잘못된 백업 파일입니다.');
    if (Array.isArray(data.wedding_rsvps)) writeList(KEYS.wedding, data.wedding_rsvps);
    if (Array.isArray(data.afterparty_guests)) writeList(KEYS.apGuests, data.afterparty_guests);
    if (Array.isArray(data.afterparty_rsvps)) writeList(KEYS.apRsvps, data.afterparty_rsvps);
    if (Array.isArray(data.guestbook)) writeList(KEYS.guestbook, data.guestbook);
    if (data.configOverride && typeof data.configOverride === 'object') {
      for (const scope of ['invite', 'kr', 'en']) {
        if (data.configOverride[scope]) await saveConfigOverride(scope, data.configOverride[scope]);
      }
    }
  }

  return {
    backend: 'localStorage',
    // wedding
    submitWeddingRsvp, addRsvp, listWeddingRsvps, listRsvps, deleteWeddingRsvp, deleteRsvp,
    // afterparty
    importAfterpartyGuests, listAfterpartyGuests, deleteAfterpartyGuest,
    lookupAfterpartyGuest, submitAfterpartyRsvp, listAfterpartyRsvps, deleteAfterpartyRsvp,
    // guestbook
    listGuestbook, addGuestbook, deleteGuestbook,
    // config
    getConfigOverride, saveConfigOverride, clearConfigOverride,
    // admin
    adminSignIn, adminSignOut, isAdmin,
    // backup
    exportAll, importAll,
  };
})();
