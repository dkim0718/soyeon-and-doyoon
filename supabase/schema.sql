-- =========================================================
-- Wedding site — Supabase / Postgres schema
-- ---------------------------------------------------------
-- Run this whole file once in the Supabase SQL editor
-- (Project → SQL Editor → New query → paste → Run).
--
-- WHY THE ANON KEY IS SAFE TO SHIP IN STATIC JS
-- ---------------------------------------------------------
-- The "anon public" key only lets a browser talk to Postgres
-- AS THE `anon` ROLE. Row Level Security (RLS), enabled on
-- every table below, is the real gate. With these policies the
-- anon role can only:
--   • INSERT a wedding RSVP  (self-report; cannot read them back)
--   • INSERT a guestbook message (cannot read the raw table)
--   • SELECT the guestbook_public view (no password_hash)
--   • SELECT config_overrides (public site content)
--   • EXECUTE lookup_afterparty / submit_afterparty  (SECURITY
--     DEFINER RPCs that only ever return the ONE matching guest,
--     never the whole curated invite list)
-- The anon role has NO direct access to afterparty_guests /
-- afterparty_rsvps and cannot SELECT wedding_rsvps or the raw
-- guestbook table. Everything an admin needs (reading lists,
-- imports, deletes) requires an authenticated Supabase Auth
-- session (magic link) whose email you added to adminEmails.
-- =========================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- =========================================================
-- TABLES
-- =========================================================

-- Open self-report RSVP (모청 + Korean site). Guests write, only
-- admins read.
create table if not exists public.wedding_rsvps (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  side        text not null default 'groom' check (side in ('groom', 'bride')),
  attending   boolean not null default true,
  party_count integer not null default 1 check (party_count >= 0 and party_count <= 100),
  phone       text not null default '',
  companion   text not null default '',
  meal        text not null default '',
  bus         text not null default '',
  message     text not null default '',
  locale      text not null default 'ko' check (locale in ('ko', 'en')),
  created_at  timestamptz not null default now()
);
create index if not exists wedding_rsvps_created_idx on public.wedding_rsvps (created_at desc);

-- Curated afterparty invite list (English site). name_norm is a
-- generated, normalised key used for case/space-insensitive name
-- lookups. invite_code is the optional private link token.
create table if not exists public.afterparty_guests (
  id          uuid primary key default gen_random_uuid(),
  display_name text not null,
  name_norm   text generated always as (lower(btrim(regexp_replace(display_name, '\s+', ' ', 'g')))) stored,
  invite_code text unique,
  side        text not null default 'both' check (side in ('groom', 'bride', 'both')),
  locale      text not null default 'en' check (locale in ('ko', 'en')),
  party_limit integer not null default 1 check (party_limit between 1 and 20),
  group_label text not null default '',
  notes       text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists afterparty_guests_name_norm_idx on public.afterparty_guests (name_norm);

-- One response per guest (guest_id is unique → the upsert target).
create table if not exists public.afterparty_rsvps (
  id            uuid primary key default gen_random_uuid(),
  guest_id      uuid not null unique references public.afterparty_guests (id) on delete cascade,
  attending     boolean not null default true,
  party_count   integer not null default 1 check (party_count >= 0),
  companions    text[] not null default '{}',
  contact_email text not null default '',
  contact_phone text not null default '',
  message       text not null default '',
  locale        text not null default 'en' check (locale in ('ko', 'en')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Guestbook (방명록). password_hash lets the original author delete
-- their own note; it is NEVER exposed to the public read path.
create table if not exists public.guestbook (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  message       text not null,
  password_hash text not null,
  locale        text not null default 'ko' check (locale in ('ko', 'en')),
  created_at    timestamptz not null default now()
);
create index if not exists guestbook_created_idx on public.guestbook (created_at desc);

-- Per-scope admin content overrides ('invite' | 'kr' | 'en').
-- Public pages read these (site content); only admins write.
create table if not exists public.config_overrides (
  scope      text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Public, password-free projection of the guestbook. Runs with the
-- view owner's rights, so anon can read these columns through the
-- view without any direct grant on the base table (password_hash
-- stays unreachable).
create or replace view public.guestbook_public as
  select id, name, message, locale, created_at
  from public.guestbook;

-- =========================================================
-- ADMIN ALLOW-LIST  (enforced in RLS, not just the client)
-- ---------------------------------------------------------
-- Being merely "authenticated" is NOT enough to touch admin data:
-- Supabase's `authenticated` role is ANY signed-in user, and with
-- self-service sign-up ON anyone could mint a session. Admin table
-- access is gated on membership in this allow-list via is_admin().
--
-- SETUP (do BOTH):
--   1) insert into public.admins(email) values ('you@example.com');
--      -- use the SAME address you put in supabase-config.js adminEmails
--   2) Supabase → Authentication → Providers → Email: turn OFF
--      "Allow new users to sign up" (so only known emails get a session).
-- =========================================================

create table if not exists public.admins (
  email text primary key
);
alter table public.admins enable row level security;
-- no anon/authenticated policies → only the service role / SQL editor
-- may read or edit the allow-list.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.wedding_rsvps     enable row level security;
alter table public.afterparty_guests enable row level security;
alter table public.afterparty_rsvps  enable row level security;
alter table public.guestbook          enable row level security;
alter table public.config_overrides   enable row level security;

-- ---- wedding_rsvps ----
-- anon may INSERT (self-report) with basic length/enum guards, but
-- has NO select/update/delete policy → cannot read anyone's data.
drop policy if exists "wedding_rsvps_anon_insert" on public.wedding_rsvps;
create policy "wedding_rsvps_anon_insert" on public.wedding_rsvps
  for insert to anon
  with check (
    char_length(name) between 1 and 40
    and char_length(coalesce(message, '')) <= 500
    and char_length(coalesce(phone, '')) <= 30
    and char_length(coalesce(companion, '')) <= 120
    and side in ('groom', 'bride')
    and locale in ('ko', 'en')
    and party_count between 0 and 100
  );

drop policy if exists "wedding_rsvps_admin_all" on public.wedding_rsvps;
create policy "wedding_rsvps_admin_all" on public.wedding_rsvps
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- guestbook ----
-- anon may INSERT (with length checks). Public reads go through the
-- guestbook_public view, so anon gets NO select policy on the raw
-- table (keeps password_hash private).
drop policy if exists "guestbook_anon_insert" on public.guestbook;
create policy "guestbook_anon_insert" on public.guestbook
  for insert to anon
  with check (
    char_length(name) between 1 and 20
    and char_length(message) between 1 and 200
    and char_length(password_hash) between 1 and 200
    and locale in ('ko', 'en')
  );

drop policy if exists "guestbook_admin_all" on public.guestbook;
create policy "guestbook_admin_all" on public.guestbook
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- afterparty_guests / afterparty_rsvps ----
-- NO anon policies at all → the anon role cannot touch these tables
-- directly. Guests reach their own row only via the SECURITY DEFINER
-- RPCs below. Authenticated admins get full access.
drop policy if exists "afterparty_guests_admin_all" on public.afterparty_guests;
create policy "afterparty_guests_admin_all" on public.afterparty_guests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "afterparty_rsvps_admin_all" on public.afterparty_rsvps;
create policy "afterparty_rsvps_admin_all" on public.afterparty_rsvps
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- config_overrides ----
-- Public pages read site content; only admins write it.
drop policy if exists "config_overrides_public_read" on public.config_overrides;
create policy "config_overrides_public_read" on public.config_overrides
  for select to anon using (true);

drop policy if exists "config_overrides_admin_all" on public.config_overrides;
create policy "config_overrides_admin_all" on public.config_overrides
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =========================================================
-- TABLE-LEVEL GRANTS
-- ---------------------------------------------------------
-- RLS only narrows what a role is already granted, so the base
-- privileges must exist too. We grant the anon role the bare
-- minimum and give authenticated admins everything.
-- =========================================================

grant usage on schema public to anon, authenticated;

grant insert on public.wedding_rsvps to anon;
grant insert on public.guestbook     to anon;
grant select on public.guestbook_public   to anon, authenticated;
grant select on public.config_overrides    to anon;

grant select, insert, update, delete on public.wedding_rsvps     to authenticated;
grant select, insert, update, delete on public.afterparty_guests to authenticated;
grant select, insert, update, delete on public.afterparty_rsvps  to authenticated;
grant select, insert, update, delete on public.guestbook          to authenticated;
grant select, insert, update, delete on public.config_overrides   to authenticated;

-- =========================================================
-- SECURITY DEFINER RPCs  (the only public window into the
-- curated afterparty list — they return ONE guest, never the set)
-- =========================================================

-- Look up a single afterparty guest by exact invite_code OR by
-- normalised name, and return that guest's minimal public columns
-- plus their existing RSVP (if any) as JSON.
--   • exact/unique match  → { guest:{...}, rsvp:{...}|null }
--   • name matches many   → { ambiguous:true, count:N }
--   • no match            → null
create or replace function public.lookup_afterparty(p_code text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.afterparty_guests%rowtype;
  v_rsvp  public.afterparty_rsvps%rowtype;
  v_norm  text;
  v_count integer;
begin
  -- 1) exact invite_code (case-insensitive) wins
  if p_code is not null and btrim(p_code) <> '' then
    select * into v_guest
    from public.afterparty_guests
    where upper(invite_code) = upper(btrim(p_code))
    limit 1;
  end if;

  -- 2) otherwise fall back to a unique normalised-name match
  if v_guest.id is null and p_name is not null and btrim(p_name) <> '' then
    v_norm := lower(btrim(regexp_replace(p_name, '\s+', ' ', 'g')));
    select count(*) into v_count
    from public.afterparty_guests
    where name_norm = v_norm;

    if v_count > 1 then
      return jsonb_build_object('ambiguous', true, 'count', v_count);
    elsif v_count = 1 then
      select * into v_guest
      from public.afterparty_guests
      where name_norm = v_norm
      limit 1;
    end if;
  end if;

  if v_guest.id is null then
    return null;
  end if;

  select * into v_rsvp
  from public.afterparty_rsvps
  where guest_id = v_guest.id
  limit 1;

  return jsonb_build_object(
    'guest', jsonb_build_object(
      'id',          v_guest.id,
      'display_name', v_guest.display_name,
      'side',        v_guest.side,
      'locale',      v_guest.locale,
      'party_limit', v_guest.party_limit,
      'invite_code', v_guest.invite_code,
      'group_label', v_guest.group_label
    ),
    'rsvp', case when v_rsvp.id is null then null else jsonb_build_object(
      'id',            v_rsvp.id,
      'guest_id',      v_rsvp.guest_id,
      'attending',     v_rsvp.attending,
      'party_count',   v_rsvp.party_count,
      'companions',    to_jsonb(v_rsvp.companions),
      'contact_email', v_rsvp.contact_email,
      'contact_phone', v_rsvp.contact_phone,
      'message',       v_rsvp.message,
      'locale',        v_rsvp.locale,
      'created_at',    v_rsvp.created_at,
      'updated_at',    v_rsvp.updated_at
    ) end
  );
end;
$$;

-- Submit (or update) an afterparty RSVP. Re-resolves the guest's
-- identity server-side (never trusts a guest_id from the client),
-- enforces the party allotment, and upserts on guest_id.
-- Raises 'GUEST_NOT_FOUND' | 'AMBIGUOUS' | 'OVER_LIMIT' so the
-- client can map them to friendly messages. Returns the saved row.
create or replace function public.submit_afterparty(
  p_name       text,
  p_code       text,
  p_attending  boolean,
  p_party      integer,
  p_companions text[],
  p_email      text,
  p_phone      text,
  p_message    text,
  p_locale     text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest      public.afterparty_guests%rowtype;
  v_row        public.afterparty_rsvps%rowtype;
  v_norm       text;
  v_count      integer;
  v_attending  boolean := coalesce(p_attending, true);
  v_party      integer := greatest(1, coalesce(p_party, 1));
  v_companions text[]  := coalesce(p_companions, '{}');
  v_locale     text    := case when p_locale = 'ko' then 'ko' else 'en' end;
begin
  -- Re-resolve identity exactly like lookup_afterparty.
  if p_code is not null and btrim(p_code) <> '' then
    select * into v_guest
    from public.afterparty_guests
    where upper(invite_code) = upper(btrim(p_code))
    limit 1;
  end if;

  if v_guest.id is null and p_name is not null and btrim(p_name) <> '' then
    v_norm := lower(btrim(regexp_replace(p_name, '\s+', ' ', 'g')));
    select count(*) into v_count
    from public.afterparty_guests
    where name_norm = v_norm;

    if v_count > 1 then
      raise exception 'AMBIGUOUS';
    elsif v_count = 1 then
      select * into v_guest
      from public.afterparty_guests
      where name_norm = v_norm
      limit 1;
    end if;
  end if;

  if v_guest.id is null then
    raise exception 'GUEST_NOT_FOUND';
  end if;

  -- Enforce allotment.
  if v_attending and v_party > v_guest.party_limit then
    raise exception 'OVER_LIMIT';
  end if;
  if not v_attending then
    v_party := 0;
  end if;

  -- Keep at most (party_limit - 1) companions.
  if array_length(v_companions, 1) is not null then
    v_companions := v_companions[1:greatest(0, v_guest.party_limit - 1)];
  end if;

  insert into public.afterparty_rsvps as r
    (guest_id, attending, party_count, companions,
     contact_email, contact_phone, message, locale, created_at, updated_at)
  values
    (v_guest.id, v_attending, v_party, v_companions,
     coalesce(p_email, ''), coalesce(p_phone, ''), coalesce(p_message, ''),
     v_locale, now(), now())
  on conflict (guest_id) do update set
    attending     = excluded.attending,
    party_count   = excluded.party_count,
    companions    = excluded.companions,
    contact_email = excluded.contact_email,
    contact_phone = excluded.contact_phone,
    message       = excluded.message,
    locale        = excluded.locale,
    updated_at    = now()
  returning * into v_row;

  return jsonb_build_object(
    'id',            v_row.id,
    'guest_id',      v_row.guest_id,
    'attending',     v_row.attending,
    'party_count',   v_row.party_count,
    'companions',    to_jsonb(v_row.companions),
    'contact_email', v_row.contact_email,
    'contact_phone', v_row.contact_phone,
    'message',       v_row.message,
    'locale',        v_row.locale,
    'created_at',    v_row.created_at,
    'updated_at',    v_row.updated_at
  );
end;
$$;

-- Guests (anon) and admins may call the RPCs; they are the ONLY
-- path from the anon role into the afterparty tables.
grant execute on function public.lookup_afterparty(text, text) to anon, authenticated;
grant execute on function public.submit_afterparty(text, text, boolean, integer, text[], text, text, text, text) to anon, authenticated;

-- Let a guestbook author delete their OWN note with the password they set,
-- without any anon delete grant on the table. The hash is verified server-side
-- and matches the JS SHA-256 ('mochung::' + password) used by both adapters.
create or replace function public.delete_guestbook(p_id uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
begin
  select password_hash into v_hash from public.guestbook where id = p_id;
  if v_hash is null then
    raise exception 'NOT_FOUND';
  end if;
  if v_hash <> encode(digest('mochung::' || coalesce(p_password, ''), 'sha256'), 'hex') then
    raise exception 'BAD_PASSWORD';
  end if;
  delete from public.guestbook where id = p_id;
end;
$$;
grant execute on function public.delete_guestbook(uuid, text) to anon, authenticated;
