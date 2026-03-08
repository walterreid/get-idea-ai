-- ============================================================
-- 001_foundation.sql — GetIdea.ai
-- Run via: supabase db push  (or paste into Supabase SQL editor)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- profiles — extends auth.users with business context
-- ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid        primary key references auth.users (id) on delete cascade,
  display_name  text,
  business_type text,
  created_at    timestamptz not null default now()
);

-- Auto-create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- threads — conversation containers
-- ────────────────────────────────────────────────────────────
create table if not exists public.threads (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  title       text        not null default 'New conversation',
  status      text        not null default 'active' check (status in ('active', 'archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Keep updated_at current automatically
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists threads_updated_at on public.threads;
create trigger threads_updated_at
  before update on public.threads
  for each row execute procedure public.touch_updated_at();

-- ────────────────────────────────────────────────────────────
-- messages — every utterance in a thread
-- ────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id          uuid        primary key default gen_random_uuid(),
  thread_id   uuid        not null references public.threads (id) on delete cascade,
  role        text        not null check (role in ('user', 'agent', 'orchestrator', 'system')),
  agent_name  text,
  content     text        not null,
  metadata    jsonb,      -- routing reasons, deliberation phase, user_sophistication, etc.
  created_at  timestamptz not null default now()
);

-- Index for fast thread message retrieval in order
create index if not exists messages_thread_created
  on public.messages (thread_id, created_at asc);

-- ────────────────────────────────────────────────────────────
-- agent_configs — runtime-configurable agent identities
-- No agent identity is hardcoded in application logic.
-- ────────────────────────────────────────────────────────────
create table if not exists public.agent_configs (
  id                          uuid        primary key default gen_random_uuid(),
  name                        text        not null unique,
  display_name                text        not null,
  description_for_orchestrator text       not null,
  system_prompt               text        not null,
  model_provider              text        not null check (model_provider in ('openai', 'anthropic')),
  model_name                  text        not null,
  voice_style                 text        not null,
  risk_tolerance              text        not null check (risk_tolerance in ('low', 'medium', 'high')),
  expertise_domains           text[]      not null default '{}',
  status                      text        not null default 'active' check (status in ('active', 'inactive', 'system')),
  sort_order                  int         not null default 0,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

drop trigger if exists agent_configs_updated_at on public.agent_configs;
create trigger agent_configs_updated_at
  before update on public.agent_configs
  for each row execute procedure public.touch_updated_at();

-- ────────────────────────────────────────────────────────────
-- idea_insights — institutional memory extracted from deliberations
-- ────────────────────────────────────────────────────────────
create table if not exists public.idea_insights (
  id            uuid        primary key default gen_random_uuid(),
  thread_id     uuid        not null references public.threads (id) on delete cascade,
  insight_type  text        not null check (insight_type in ('strength', 'risk', 'question', 'recommendation', 'pattern')),
  source_agent  text        not null,
  content       text        not null,
  created_at    timestamptz not null default now()
);

create index if not exists idea_insights_thread
  on public.idea_insights (thread_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles      enable row level security;
alter table public.threads       enable row level security;
alter table public.messages      enable row level security;
alter table public.agent_configs enable row level security;
alter table public.idea_insights enable row level security;

-- ── profiles ────────────────────────────────────────────────
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ── threads ─────────────────────────────────────────────────
create policy "Users can view own threads"
  on public.threads for select
  using (auth.uid() = user_id);

create policy "Users can insert own threads"
  on public.threads for insert
  with check (auth.uid() = user_id);

create policy "Users can update own threads"
  on public.threads for update
  using (auth.uid() = user_id);

create policy "Users can delete own threads"
  on public.threads for delete
  using (auth.uid() = user_id);

-- ── messages ────────────────────────────────────────────────
create policy "Users can view messages in own threads"
  on public.messages for select
  using (
    exists (
      select 1 from public.threads t
      where t.id = messages.thread_id and t.user_id = auth.uid()
    )
  );

create policy "Users can insert messages in own threads"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.threads t
      where t.id = messages.thread_id and t.user_id = auth.uid()
    )
  );

-- ── agent_configs ────────────────────────────────────────────
-- All authenticated users can read agent configs.
-- Only service role (backend) can write — no direct user mutations.
create policy "Authenticated users can read agent configs"
  on public.agent_configs for select
  to authenticated
  using (true);

-- ── idea_insights ────────────────────────────────────────────
create policy "Users can view insights in own threads"
  on public.idea_insights for select
  using (
    exists (
      select 1 from public.threads t
      where t.id = idea_insights.thread_id and t.user_id = auth.uid()
    )
  );

create policy "Users can insert insights in own threads"
  on public.idea_insights for insert
  with check (
    exists (
      select 1 from public.threads t
      where t.id = idea_insights.thread_id and t.user_id = auth.uid()
    )
  );
