# Supabase — the shared backend

> **STATUS: LIVE since 2026-07-12.** Project `soyeondoyoon-wedding` (Seoul,
> `tggzvaivpvkaqqvruwze`). Steps 1–6 below are all done — kept for reference /
> disaster recovery. The guest-list section at the bottom is the part you'll
> still use.

Without Supabase configured, every page runs on a **localStorage fallback**: it all
works, but RSVPs/guestbook/edits live only in each visitor's own browser. Turning on
Supabase makes one shared database behind all four subdomains.

Everything below is a one-time setup (~15 minutes).

## 1. Create the project *(only you can do this)*

1. [supabase.com](https://supabase.com) → sign in (GitHub login is easiest).
2. **New project** → name `soyeondoyoon-wedding`, region **Northeast Asia (Seoul)**,
   any strong database password (save it somewhere — rarely needed again). Free plan.

## 2. Apply the schema

SQL Editor → **New query** → paste the entire contents of [`schema.sql`](schema.sql) → **Run**.
It's idempotent — safe to re-run after edits.

## 3. Admin access (magic-link login for the admin site)

1. SQL Editor: `insert into public.admins (email) values ('dkim0718@gmail.com');`
   (repeat for any other admin email — this allow-list is what RLS trusts).
2. **Authentication → Users → Add user** → same email, check *Auto Confirm*.
3. **Authentication → Sign In/Up** → turn **off** "Allow new users to sign up"
   (do this *after* step 2, or the magic link can't create the account).
4. **Authentication → URL Configuration** → Site URL `https://doremi.soyeondoyoon.cloud`,
   and add `https://doremi.soyeondoyoon.cloud/**` to Redirect URLs.

## 4. Wire the keys into the sites

**Project Settings → API**: copy the **Project URL** and the **anon public** key into
[`../shared/supabase-config.js`](../shared/supabase-config.js) (`url`, `anonKey`, and
your email in `adminEmails`), commit, push. All four sites rebuild and switch over —
the browser console logs `[Store] backend = supabase`.

> The anon key is **safe to commit**: Row Level Security (in `schema.sql`) is the real
> gate. Anonymous visitors can submit RSVPs and look *themselves* up, but can never
> read the guest list or other people's responses.

## 5. Verify

- Submit a wedding RSVP on `soyeondoyoon.fun` → it appears in the admin dashboard
  (`doremi.soyeondoyoon.cloud`, after magic-link sign-in) **from a different browser**.
- On `soyeondoyoon.fun/en/?code=…` a seeded guest sees their name + allotment; a
  submit with more seats than allowed is rejected (`OVER_LIMIT`).
- Browser console on any page: `Store.backend` → `"supabase"`;
  `supabase.from('afterparty_guests').select('*')` → empty/denied (RLS working).

## 6. Keep the free project awake

Free-tier projects **pause after ~7 days without database activity**, which would break
the RSVP forms. Either add the scheduled GitHub Action ping (ask Claude — added once the
keys exist) or pay for Supabase Pro for the wedding months.

---

# Afterparty guest list (the +1 database)

Two ways to manage it, freely mixable:

- **Directly on the admin page** (admin → 애프터파티): the *게스트 추가 · 수정* form adds
  or edits one guest at a time, each row has a one-click **+1 허용/해제** toggle plus
  수정/삭제 buttons. Best for day-to-day tweaks.
- **CSV import** for the initial bulk load: maintain the list in Google Sheets/Excel with
  **exactly these headers**, export as CSV, and import via **명단 가져오기**. Template with
  sample rows: [`guest-list.template.csv`](guest-list.template.csv).

| Column | Required | Meaning |
|---|---|---|
| `display_name` | ✅ | Guest's name, as greeted on the RSVP page and matched on name lookup. |
| `invite_code` | recommended | Unique token for their personal link `https://soyeondoyoon.fun/en/?code=…`. Blank = name lookup only. |
| `side` | | `groom` \| `bride` \| `both`. |
| `locale` | | `en` \| `ko` — which language site they'll likely use. |
| `party_limit` | | **The +1 switch.** Total seats *including* the guest: `2` = Group A (+1 allowed), `1` = Group B (no +1). Max 20. |
| `group_label` | | Your grouping tag shown in admin — use `A` / `B` (free text). |
| `notes` | | Private admin notes; never shown to guests. |

**How the +1 rules work (since 2026-07-12):**

- **English site — open RSVP, automatic +1.** Anyone can RSVP by name (no code needed)
  with up to **2 seats**; unknown names self-register a guest row here (`notes:
  self-registered`, limit 2). Listed guests keep any *larger* allotment (e.g. a couple
  invite with `party_limit 4`), and even a `party_limit 1` row gets 2 when submitting
  from the EN site. The server enforces the cap on submit (`OVER_LIMIT`).
- **Korean website — +1 only for listed names.** The KR RSVP form keeps the party
  selector at 1 unless the typed name matches a row in this table with `party_limit ≥ 2`
  (matching is client-side via the same lookup; the 모청's own RSVP form keeps its free
  인원 count for parents' guests).

**What you do NOT pre-load** — these are *response* data, filled in by the guest when
they RSVP and visible in the admin joined table / CSV export (`응답 내보내기`):

- `rsvp_status` — derived: no response yet = 대기, then 참석/불참 (`attending` true/false).
- `companion_name` — the +1's name(s) the guest types in (`companions`).

**Iterating is safe:** re-importing upserts by `invite_code` (or by normalized name for
code-less rows) — corrected rows update in place, nothing duplicates.

**Sheets tip:** keep a human column `invite_type` (A/B) and compute
`party_limit` with `=IF(invite_type="A", 2, 1)`. Codes just need to be unique and
hard to guess — `NAME-3랜덤문자` like the template works fine.
