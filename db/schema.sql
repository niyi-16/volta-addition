-- Founder Pinboard schema (implementation plan §4), in its own schema so it
-- never touches anything else in the database. Mock data only for now.
-- Idempotent: `npm run db:migrate` re-runs it to add new tables.
-- Ids are text so hand-added rows can use readable ids; the default is a uuid.

create schema if not exists pinboard;
set search_path = pinboard;

create table if not exists founders (
  id           text primary key default gen_random_uuid()::text,
  email        text not null unique,
  display_name text not null,
  company_name text not null default '',
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists topics (
  id          text primary key default gen_random_uuid()::text,
  label       text not null,
  category    text not null default 'Other',
  keywords    text[] not null default '{}',
  hidden      boolean not null default false,
  merged_into text references topics(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- One row per submitted monthly update. Metadata only: the founder's written
-- answers stay in the portal and are never stored here (C1).
create table if not exists updates (
  id           text primary key default gen_random_uuid()::text,
  founder_id   text not null references founders(id) on delete cascade,
  submitted_at timestamptz not null default now()
);

-- A share is visible on the Pinboard only while consented_at is set and
-- withdrawn_at is null (C2, C10).
create table if not exists shares (
  id           text primary key default gen_random_uuid()::text,
  founder_id   text not null references founders(id) on delete cascade,
  topic_id     text not null references topics(id) on delete cascade,
  update_id    text references updates(id) on delete set null,
  kind         text not null check (kind in ('working', 'lived')),
  consented_at timestamptz,
  withdrawn_at timestamptz,
  ended_reason text check (ended_reason in ('withdrawn', 'replaced'))
);

create table if not exists groups (
  id            text primary key default gen_random_uuid()::text,
  topic_id      text not null references topics(id) on delete cascade,
  status        text not null default 'open' check (status in ('open', 'introduced')),
  introduced_at timestamptz
);

-- Exists only after the founder confirmed the "your name and email will be
-- shared" dialog (C4).
create table if not exists group_members (
  id           text primary key default gen_random_uuid()::text,
  group_id     text not null references groups(id) on delete cascade,
  founder_id   text not null references founders(id) on delete cascade,
  confirmed_at timestamptz not null default now(),
  left_at      timestamptz
);

create table if not exists asks (
  id           text primary key default gen_random_uuid()::text,
  asker_id     text not null references founders(id) on delete cascade,
  recipient_id text not null references founders(id) on delete cascade,
  topic_id     text not null references topics(id) on delete cascade,
  note         text not null check (char_length(note) <= 500),
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz
);

create table if not exists connections (
  id          text primary key default gen_random_uuid()::text,
  source      text not null check (source in ('group', 'ask')),
  source_id   text not null,
  founder_ids text[] not null,
  created_at  timestamptz not null default now()
);

create table if not exists email_log (
  id             text primary key default gen_random_uuid()::text,
  template       text not null check (template in ('nudge', 'group_intro', 'group_joined', 'ask_request', 'ask_intro')),
  to_founder_ids text[] not null,
  subject        text not null,
  body           text not null,
  mode           text not null default 'log' check (mode in ('log', 'send')),
  sent_at        timestamptz not null default now()
);

create table if not exists audit_log (
  id         text primary key default gen_random_uuid()::text,
  founder_id text references founders(id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  text not null,
  at         timestamptz not null default now()
);

create table if not exists notices (
  id         text primary key default gen_random_uuid()::text,
  founder_id text not null references founders(id) on delete cascade,
  text       text not null,
  at         timestamptz not null default now()
);

-- At most one nudge per founder per topic (C6).
create table if not exists nudges (
  id         text primary key default gen_random_uuid()::text,
  founder_id text not null references founders(id) on delete cascade,
  topic_id   text not null references topics(id) on delete cascade,
  sent_at    timestamptz not null default now(),
  unique (founder_id, topic_id)
);

-- F8 events. "Later, only if confirmed" in the plan: attendance comes from the
-- in-app "I'm going" button until Volta confirms a real RSVP source.
create table if not exists events (
  id              text primary key default gen_random_uuid()::text,
  title           text not null,
  starts_at       timestamptz not null,
  location        text not null default '',
  kind            text not null default 'other' check (kind in ('lunch', 'happier_hour', 'breakfast', 'other')),
  list_by_default boolean not null default true
);

-- show_on_list is its own opt-in: other founders see the RSVP only when true.
-- Volta staff always see who is going.
create table if not exists rsvps (
  id           text primary key default gen_random_uuid()::text,
  event_id     text not null references events(id) on delete cascade,
  founder_id   text not null references founders(id) on delete cascade,
  show_on_list boolean not null default true,
  created_at   timestamptz not null default now(),
  cancelled_at timestamptz,
  unique (event_id, founder_id)
);

-- Founder profile fields from the demo data pack.
alter table founders add column if not exists role text not null default '';
alter table founders add column if not exists company_description text not null default '';
alter table founders add column if not exists stage text not null default '';
alter table founders add column if not exists team_size integer;
alter table founders add column if not exists location text not null default '';
alter table founders add column if not exists visits_volta text not null default '';

-- Topic chosen when signing up for an event (Happier Hour rooms).
alter table rsvps add column if not exists signup_topic text;
