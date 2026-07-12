/* =========================================================
 * Supabase configuration (shared data backend)
 * ---------------------------------------------------------
 * Leave BOTH values empty to run on the built-in localStorage
 * fallback (great for local dev — data stays on this device).
 *
 * To turn on the real shared database (one guest list + RSVPs
 * across all three subdomains):
 *   1. Create a free project at https://supabase.com
 *   2. Run supabase/schema.sql in the SQL editor
 *   3. Project Settings → API → paste the Project URL and the
 *      "anon public" key below.
 *
 * The anon key is SAFE to commit in static JS: Row Level
 * Security (see schema.sql) is the real gate — it lets guests
 * submit and look themselves up, but never download the list.
 *
 * For local-only keys you don't want committed, create
 * shared/supabase-config.local.js with the same shape and load
 * it AFTER this file (it's gitignored).
 * ========================================================= */
window.SUPABASE_CONFIG = {
  url: 'https://tggzvaivpvkaqqvruwze.supabase.co',
  anonKey: 'sb_publishable_zbWod8789xhWf6sLKbdB-A_zBdo4h2W',
  // Email addresses allowed into the admin dashboard (Supabase Auth
  // magic-link). Must ALSO be in the public.admins table (RLS gate).
  adminEmails: ['dkim0718@gmail.com'],
};
