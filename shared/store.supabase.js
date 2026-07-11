/* =========================================================
 * Store — Supabase adapter (real shared backend)
 * ---------------------------------------------------------
 * Implements the SAME interface as window.StoreLocal
 * (see shared/store.localStorage.js) against a real Supabase
 * project, so data is shared across all three subdomains.
 *
 * Activation: this file defines window.StoreSupabase ONLY when
 *   • SUPABASE_CONFIG.url and .anonKey are both set, AND
 *   • the @supabase/supabase-js@2 library loaded (window.supabase)
 * Otherwise it does nothing and the façade (store.js) falls back
 * to the localStorage adapter — local dev works with no project.
 *
 * Security model (see supabase/schema.sql for the full note):
 *   • The anon key is safe in static JS — Row Level Security is
 *     the gate. Guests can insert their own RSVP / guestbook note
 *     but never download a list.
 *   • Guest-facing afterparty methods (lookupAfterpartyGuest,
 *     submitAfterpartyRsvp) go through SECURITY DEFINER RPCs that
 *     return only the ONE matching guest — never the whole list.
 *   • Admin methods use ordinary table reads/writes, which RLS
 *     allows only for an authenticated Supabase Auth session whose
 *     email is in SUPABASE_CONFIG.adminEmails.
 *
 * Config overrides are stored in the config_overrides table
 * (scope text primary key, data jsonb): anon may read them (public
 * site content), only an admin may write them.
 * ========================================================= */
(function () {
  'use strict';

  var cfg = window.SUPABASE_CONFIG || {};
  if (!cfg.url || !cfg.anonKey || !window.supabase) return; // → localStorage fallback

  var client = window.supabase.createClient(cfg.url, cfg.anonKey);

  /* ---------- helpers ---------- */

  function str(v, max) {
    var s = String(v == null ? '' : v).trim();
    return max ? s.slice(0, max) : s;
  }

  function toInt(v, def) {
    var n = parseInt(v, 10);
    return Number.isFinite(n) ? n : def;
  }

  function normName(s) {
    return String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ');
  }

  // Throw on a Supabase/PostgREST error, otherwise return `data`.
  function unwrap(res) {
    if (res && res.error) throw res.error;
    return res ? res.data : null;
  }

  // Map a raised-RPC error to the interface's err.code values.
  function rpcError(error) {
    var msg = (error && (error.message || error.hint || error.details)) || 'ERROR';
    var e = new Error(msg);
    if (/OVER_LIMIT/.test(msg)) e.code = 'OVER_LIMIT';
    else if (/GUEST_NOT_FOUND/.test(msg)) e.code = 'GUEST_NOT_FOUND';
    else if (/AMBIGUOUS/.test(msg)) e.code = 'AMBIGUOUS';
    return e;
  }

  /* =======================================================
   * Wedding RSVP (open self-report) — 모청 + KR site
   * ===================================================== */

  // Anon INSERT. RLS forbids anon from reading wedding_rsvps back,
  // so we do NOT chain .select() (that would need a read policy);
  // we echo the shaped row for callers that want a return value.
  async function submitWeddingRsvp(data) {
    var row = {
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
    };
    var res = await client.from('wedding_rsvps').insert(row);
    if (res && res.error) throw res.error;
    return Object.assign({ id: null, created_at: new Date().toISOString() }, row);
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
    var q = client.from('wedding_rsvps').select('*').order('created_at', { ascending: false });
    if (filter.side) q = q.eq('side', filter.side);
    if (filter.locale) q = q.eq('locale', filter.locale);
    return unwrap(await q) || [];
  }
  async function listRsvps() { return listWeddingRsvps(); }

  async function deleteWeddingRsvp(id) {
    var res = await client.from('wedding_rsvps').delete().eq('id', id);
    if (res && res.error) throw res.error;
  }
  async function deleteRsvp(id) { return deleteWeddingRsvp(id); }

  /* =======================================================
   * Afterparty (curated invite list + allotments) — EN site
   * ===================================================== */

  // Admin: bulk import the pre-loaded invite list. Mirrors the
  // localStorage upsert semantics (match by invite_code, else by
  // normalised name). Runs as an authenticated admin (table ops).
  async function importAfterpartyGuests(rows) {
    var existing = unwrap(await client.from('afterparty_guests')
      .select('id, invite_code, name_norm')) || [];
    var byCode = new Map();
    var byName = new Map();
    existing.forEach(function (g) {
      if (g.invite_code) byCode.set(g.invite_code, g);
      byName.set(g.name_norm, g);
    });

    var inserted = 0, updated = 0, skipped = 0;
    var errors = [];

    for (var i = 0; i < (rows || []).length; i++) {
      var row = rows[i];
      var display_name = str(row.display_name, 80);
      if (!display_name) { skipped++; errors.push('row ' + (i + 1) + ': missing display_name'); continue; }
      var code = str(row.invite_code, 40) || null;
      // name_norm is a generated column — never sent, only used to match.
      var rec = {
        display_name: display_name,
        invite_code: code,
        side: ['groom', 'bride', 'both'].indexOf(row.side) >= 0 ? row.side : 'both',
        locale: row.locale === 'ko' ? 'ko' : 'en',
        party_limit: Math.min(20, Math.max(1, toInt(row.party_limit, 1))),
        group_label: str(row.group_label, 60),
        notes: str(row.notes, 200),
      };
      // Coded rows are identified by code only (duplicate names with distinct
      // codes both import); codeless rows fall back to matching by name.
      var match = code ? byCode.get(code) : byName.get(normName(display_name));
      try {
        if (match) {
          unwrap(await client.from('afterparty_guests').update(rec).eq('id', match.id));
          updated++;
        } else {
          var created = unwrap(await client.from('afterparty_guests')
            .insert(rec).select('id, invite_code, name_norm').single());
          if (created) {
            if (created.invite_code) byCode.set(created.invite_code, created);
            byName.set(created.name_norm, created);
          }
          inserted++;
        }
      } catch (e) {
        skipped++;
        errors.push('row ' + (i + 1) + ': ' + (e && e.message ? e.message : 'failed'));
      }
    }
    return { inserted: inserted, updated: updated, skipped: skipped, errors: errors };
  }

  async function listAfterpartyGuests() {
    var list = unwrap(await client.from('afterparty_guests')
      .select('*').order('display_name', { ascending: true })) || [];
    return list;
  }

  async function deleteAfterpartyGuest(id) {
    // afterparty_rsvps.guest_id has ON DELETE CASCADE, so the RSVP goes too.
    var res = await client.from('afterparty_guests').delete().eq('id', id);
    if (res && res.error) throw res.error;
  }

  // PUBLIC: a guest looks up their own invitation via SECURITY
  // DEFINER RPC. Never selects the afterparty_guests table, so the
  // curated list can never be downloaded. Returns the same shapes
  // as the localStorage adapter: {guest, rsvp} | {ambiguous,count} | null
  async function lookupAfterpartyGuest(query) {
    query = query || {};
    var res = await client.rpc('lookup_afterparty', {
      p_code: query.code != null ? String(query.code) : null,
      p_name: query.name != null ? String(query.name) : null,
    });
    if (res && res.error) { console.error('[Store] lookup_afterparty', res.error); return null; }
    return res ? res.data : null; // jsonb: object | null
  }

  // PUBLIC: submit/update an afterparty RSVP via SECURITY DEFINER
  // RPC. Identity + allotment are enforced server-side; the RPC
  // upserts on guest_id and returns the saved row.
  async function submitAfterpartyRsvp(data) {
    data = data || {};
    var companions = (Array.isArray(data.companions) ? data.companions : [])
      .map(function (c) { return str(c, 80); }).filter(Boolean);
    var res = await client.rpc('submit_afterparty', {
      p_name: data.name != null ? String(data.name) : null,
      p_code: data.code != null ? String(data.code) : null,
      p_attending: data.attending === false ? false : true,
      p_party: Math.max(1, toInt(data.partyCount, 1)),
      p_companions: companions,
      p_email: str(data.contactEmail, 120),
      p_phone: str(data.contactPhone, 30),
      p_message: str(data.message, 500),
      p_locale: data.locale === 'ko' ? 'ko' : 'en',
    });
    if (res && res.error) throw rpcError(res.error);
    return res.data; // jsonb row
  }

  // Admin: joined view of the invite list + responses.
  async function listAfterpartyRsvps() {
    var guests = await listAfterpartyGuests();
    var rsvps = unwrap(await client.from('afterparty_rsvps').select('*')) || [];
    var byGuest = new Map(rsvps.map(function (r) { return [r.guest_id, r]; }));
    return guests.map(function (g) {
      return { guest: g, rsvp: byGuest.get(g.id) || null };
    });
  }

  async function deleteAfterpartyRsvp(id) {
    var res = await client.from('afterparty_rsvps').delete().eq('id', id);
    if (res && res.error) throw res.error;
  }

  /* =======================================================
   * Guestbook (방명록)
   * ===================================================== */

  // Public reads come from the guestbook_public view (no
  // password_hash). Map created_at → createdAt to match the shape
  // the localStorage adapter and the pages expect.
  async function listGuestbook(filter) {
    filter = filter || {};
    var q = client.from('guestbook_public').select('*').order('created_at', { ascending: false });
    if (filter.locale) q = q.eq('locale', filter.locale);
    var list = unwrap(await q) || [];
    return list.map(function (e) {
      return {
        id: e.id,
        name: e.name,
        message: e.message,
        locale: e.locale || 'ko',
        createdAt: e.created_at,
      };
    });
  }

  async function addGuestbook(input) {
    input = input || {};
    var row = {
      name: str(input.name, 20),
      message: str(input.message, 200),
      password_hash: await hashText(String(input.password)),
      locale: input.locale === 'en' ? 'en' : 'ko',
    };
    // Anon INSERT; no .select() (anon cannot read the raw table).
    var res = await client.from('guestbook').insert(row);
    if (res && res.error) throw res.error;
    return {
      id: null,
      name: row.name,
      message: row.message,
      passwordHash: row.password_hash,
      locale: row.locale,
      createdAt: new Date().toISOString(),
    };
  }

  // Admin-only on the Supabase backend: deleting a guestbook row is
  // a table op that RLS permits only for an authenticated admin.
  // (The public password-based delete path is admin-mediated here —
  // anon has no delete policy, so a password-only call is rejected.)
  async function deleteGuestbook(id, opts) {
    opts = opts || {};
    if (opts.admin) {
      var res = await client.from('guestbook').delete().eq('id', id);
      if (res && res.error) throw new Error('삭제 권한이 없습니다. 관리자로 로그인해 주세요.');
      return;
    }
    // Public author-delete: verify the password server-side via the RPC.
    var r = await client.rpc('delete_guestbook', { p_id: id, p_password: String(opts.password || '') });
    if (r && r.error) {
      var m = (r.error && r.error.message) || '';
      if (/BAD_PASSWORD/.test(m)) throw new Error('비밀번호가 일치하지 않습니다.');
      if (/NOT_FOUND/.test(m)) throw new Error('메시지를 찾을 수 없습니다.');
      throw r.error;
    }
  }

  // SHA-256 password hash, matching the localStorage adapter so a
  // note authored under either backend hashes identically.
  async function hashText(text) {
    var msg = 'mochung::' + text;
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
      return Array.from(new Uint8Array(buf)).map(function (b) {
        return b.toString(16).padStart(2, '0');
      }).join('');
    }
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < msg.length; i++) {
      var ch = msg.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 'weak-' + (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
  }

  /* =======================================================
   * Config override (per scope: 'invite' | 'kr' | 'en')
   * Stored in the config_overrides table (scope pk, data jsonb).
   * ===================================================== */

  async function getConfigOverride(scope) {
    var res = await client.from('config_overrides')
      .select('data').eq('scope', scope || 'invite').maybeSingle();
    if (res && res.error) { console.error('[Store] getConfigOverride', res.error); return null; }
    return res && res.data ? res.data.data : null;
  }

  async function saveConfigOverride(scope, obj) {
    // Back-compat: barunson admin called saveConfigOverride(obj) with one arg.
    if (obj === undefined && scope && typeof scope === 'object') { obj = scope; scope = 'invite'; }
    var res = await client.from('config_overrides')
      .upsert({ scope: scope || 'invite', data: obj || {}, updated_at: new Date().toISOString() },
        { onConflict: 'scope' });
    if (res && res.error) throw res.error;
  }

  async function clearConfigOverride(scope) {
    var res = await client.from('config_overrides').delete().eq('scope', scope || 'invite');
    if (res && res.error) throw res.error;
  }

  /* =======================================================
   * Admin auth (Supabase Auth magic link)
   * ===================================================== */

  async function adminSignIn(email) {
    var addr = str(email);
    if (!addr) return false;
    // shouldCreateUser:false → a magic link is only sent to an existing user.
    // Combined with the is_admin() RLS check + "sign-ups off" in Supabase Auth,
    // a stranger can neither self-provision a session nor read admin tables.
    var res = await client.auth.signInWithOtp({ email: addr, options: { shouldCreateUser: false } });
    return !(res && res.error);
  }

  async function adminSignOut() {
    await client.auth.signOut();
  }

  async function isAdmin() {
    var res = await client.auth.getSession();
    var session = res && res.data ? res.data.session : null;
    var email = session && session.user ? session.user.email : null;
    if (!email) return false;
    var allow = (cfg.adminEmails || []).map(function (e) { return String(e).toLowerCase(); });
    return allow.indexOf(String(email).toLowerCase()) >= 0;
  }

  /* =======================================================
   * Backup (admin-readable tables)
   * ===================================================== */

  async function exportAll() {
    var wedding = unwrap(await client.from('wedding_rsvps').select('*')) || [];
    var apGuests = unwrap(await client.from('afterparty_guests').select('*')) || [];
    var apRsvps = unwrap(await client.from('afterparty_rsvps').select('*')) || [];
    var guestbook = unwrap(await client.from('guestbook').select('*')) || [];
    return {
      exportedAt: new Date().toISOString(),
      backend: 'supabase',
      wedding_rsvps: wedding,
      afterparty_guests: apGuests,
      afterparty_rsvps: apRsvps,
      guestbook: guestbook,
      configOverride: {
        invite: await getConfigOverride('invite'),
        kr: await getConfigOverride('kr'),
        en: await getConfigOverride('en'),
      },
    };
  }

  async function importAll(data) {
    if (!data || typeof data !== 'object') throw new Error('잘못된 백업 파일입니다.');

    if (Array.isArray(data.wedding_rsvps) && data.wedding_rsvps.length) {
      unwrap(await client.from('wedding_rsvps').upsert(data.wedding_rsvps, { onConflict: 'id' }));
    }
    if (Array.isArray(data.afterparty_guests) && data.afterparty_guests.length) {
      // name_norm is generated — strip it before writing.
      var guests = data.afterparty_guests.map(function (g) {
        var out = Object.assign({}, g);
        delete out.name_norm;
        return out;
      });
      unwrap(await client.from('afterparty_guests').upsert(guests, { onConflict: 'id' }));
    }
    if (Array.isArray(data.afterparty_rsvps) && data.afterparty_rsvps.length) {
      unwrap(await client.from('afterparty_rsvps').upsert(data.afterparty_rsvps, { onConflict: 'id' }));
    }
    if (Array.isArray(data.guestbook) && data.guestbook.length) {
      // Accept both Supabase rows and localStorage-shaped rows.
      var notes = data.guestbook.map(function (e) {
        return {
          id: e.id,
          name: e.name,
          message: e.message,
          password_hash: e.password_hash || e.passwordHash || '',
          locale: e.locale || 'ko',
          created_at: e.created_at || (e.createdAt ? new Date(e.createdAt).toISOString() : undefined),
        };
      });
      unwrap(await client.from('guestbook').upsert(notes, { onConflict: 'id' }));
    }
    if (data.configOverride && typeof data.configOverride === 'object') {
      for (var s = 0, scopes = ['invite', 'kr', 'en']; s < scopes.length; s++) {
        if (data.configOverride[scopes[s]]) await saveConfigOverride(scopes[s], data.configOverride[scopes[s]]);
      }
    }
  }

  /* ---------- export ---------- */

  window.StoreSupabase = {
    backend: 'supabase',
    // wedding
    submitWeddingRsvp: submitWeddingRsvp,
    addRsvp: addRsvp,
    listWeddingRsvps: listWeddingRsvps,
    listRsvps: listRsvps,
    deleteWeddingRsvp: deleteWeddingRsvp,
    deleteRsvp: deleteRsvp,
    // afterparty
    importAfterpartyGuests: importAfterpartyGuests,
    listAfterpartyGuests: listAfterpartyGuests,
    deleteAfterpartyGuest: deleteAfterpartyGuest,
    lookupAfterpartyGuest: lookupAfterpartyGuest,
    submitAfterpartyRsvp: submitAfterpartyRsvp,
    listAfterpartyRsvps: listAfterpartyRsvps,
    deleteAfterpartyRsvp: deleteAfterpartyRsvp,
    // guestbook
    listGuestbook: listGuestbook,
    addGuestbook: addGuestbook,
    deleteGuestbook: deleteGuestbook,
    // config
    getConfigOverride: getConfigOverride,
    saveConfigOverride: saveConfigOverride,
    clearConfigOverride: clearConfigOverride,
    // admin
    adminSignIn: adminSignIn,
    adminSignOut: adminSignOut,
    isAdmin: isAdmin,
    // backup
    exportAll: exportAll,
    importAll: importAll,
  };
})();
