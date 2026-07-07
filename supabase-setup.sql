-- ═══════════════════════════════════════════════════════════════
--  WebQuote — Supabase setup
--  Spusti raz v Supabase → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════

-- Tabuľka pre uložené sessions (briefy projektov)
create table if not exists public.wq_sessions (
  id         text primary key,                          -- session slug z URL (?session=...)
  name       text,                                      -- názov projektu (pre admin zoznam)
  brief      jsonb not null default '{}'::jsonb,        -- celý brief ako JSON
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index pre zoraďovanie admin zoznamu
create index if not exists wq_sessions_updated_at_idx
  on public.wq_sessions (updated_at desc);

-- Row Level Security
alter table public.wq_sessions enable row level security;

-- Aplikácia používa anon kľúč (klient aj admin bežia v prehliadači),
-- preto povoľujeme anon prístup. Session ID v URL funguje ako "kľúč"
-- k projektu — kto nemá link, nevie ID uhádnuť.
drop policy if exists "wq_sessions_anon_select" on public.wq_sessions;
drop policy if exists "wq_sessions_anon_insert" on public.wq_sessions;
drop policy if exists "wq_sessions_anon_update" on public.wq_sessions;
drop policy if exists "wq_sessions_anon_delete" on public.wq_sessions;

create policy "wq_sessions_anon_select" on public.wq_sessions
  for select to anon using (true);
create policy "wq_sessions_anon_insert" on public.wq_sessions
  for insert to anon with check (true);
create policy "wq_sessions_anon_update" on public.wq_sessions
  for update to anon using (true) with check (true);
create policy "wq_sessions_anon_delete" on public.wq_sessions
  for delete to anon using (true);

-- Hotovo. Realtime broadcast nepotrebuje žiadne ďalšie nastavenie —
-- WebQuote používa ephemeral broadcast kanály (brief-<session>).
