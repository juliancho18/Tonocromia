create table if not exists fragments (
  id text primary key,
  label text not null,
  audio_url text,
  duration_ms integer not null default 0,
  order_index integer not null,
  active boolean not null default true
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  alias text not null,
  submitted_at timestamptz not null default now()
);

create table if not exists responses (
  submission_id uuid not null references submissions(id) on delete cascade,
  fragment_id text not null references fragments(id) on delete cascade,
  colors jsonb not null default '[]',
  emotion text,
  texture text,
  primary key (submission_id, fragment_id)
);
