-- =========================================================
-- 청모파티 RSVP — 추가 전용 마이그레이션
-- ---------------------------------------------------------
-- schema.sql 전체를 다시 돌리고 싶지 않을 때 이 파일만
-- Supabase SQL 편집기에 붙여넣어 실행하세요.
--
-- 이 스크립트는 오직 새로 만들기만 합니다:
--   • 기존 테이블을 건드리지 않습니다 (drop/alter/delete 없음)
--   • 기존 정책을 건드리지 않습니다 (party_rsvps 것만 다룹니다)
--   • 여러 번 실행해도 안전합니다
-- =========================================================

create table if not exists public.party_rsvps (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  attending       boolean not null default true,
  menu            text not null default '',
  companion_count integer not null default 0 check (companion_count >= 0 and companion_count <= 20),
  companion       text not null default '',
  phone           text not null default '',
  message         text not null default '',
  extra           jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists party_rsvps_created_idx on public.party_rsvps (created_at desc);

alter table public.party_rsvps enable row level security;

-- 손님은 INSERT 만 가능 (읽기 정책이 없으므로 남의 응답을 볼 수 없습니다)
drop policy if exists "party_rsvps_anon_insert" on public.party_rsvps;
create policy "party_rsvps_anon_insert" on public.party_rsvps
  for insert to anon
  with check (
    char_length(name) between 1 and 40
    and char_length(coalesce(menu, '')) <= 60
    and char_length(coalesce(companion, '')) <= 120
    and char_length(coalesce(phone, '')) <= 30
    and char_length(coalesce(message, '')) <= 300
    and companion_count between 0 and 20
    and pg_column_size(extra) <= 2000
  );

-- 관리자(Auth 로그인 + admins 목록)만 읽기·삭제 가능
drop policy if exists "party_rsvps_admin_all" on public.party_rsvps;
create policy "party_rsvps_admin_all" on public.party_rsvps
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant insert on public.party_rsvps to anon;
grant select, insert, update, delete on public.party_rsvps to authenticated;
