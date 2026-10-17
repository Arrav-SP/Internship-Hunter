-- Initial schema for the internship tracker (M1).
-- Statuses are text + CHECK so they are easy to evolve. RLS is enabled with no
-- policies: only the server-side secret key (which bypasses RLS) can read/write.

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Single-row profile: the boolean PK can only ever be true.
create table profile (
  id boolean primary key default true check (id),
  name text not null default '',
  email text,
  degree text,
  college text,
  grad_year int check (grad_year between 2000 and 2100),
  cgpa numeric(4, 2) check (cgpa between 0 and 10),
  target_start date,
  target_end date,
  preferred_locations text[] not null default '{}',
  work_modes text[] not null default '{}',
  skills text[] not null default '{}',
  interests text[] not null default '{}',
  links jsonb not null default '{}',
  experiences jsonb not null default '[]' check (jsonb_typeof(experiences) = 'array'),
  projects jsonb not null default '[]' check (jsonb_typeof(projects) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'posting' check (kind in ('posting', 'speculative')),
  organization text not null check (length(trim(organization)) > 0),
  title text not null check (length(trim(title)) > 0),
  description text,
  role_category text not null default 'other'
    check (role_category in ('swe', 'ml', 'data', 'research', 'other')),
  location text,
  work_mode text not null default 'unknown'
    check (work_mode in ('onsite', 'hybrid', 'remote', 'unknown')),
  start_date date,
  end_date date,
  duration_text text,
  eligibility_text text,
  required_skills text[] not null default '{}',
  preferred_skills text[] not null default '{}',
  compensation_text text,
  deadline date,
  -- 'none_stated' = source says nothing / rolling; 'unknown' = we have not checked.
  deadline_status text not null default 'unknown'
    check (deadline_status in ('stated', 'none_stated', 'unknown')),
  listing_status text not null default 'unknown'
    check (listing_status in ('open', 'closed', 'expired', 'unknown')),
  apply_url text,
  source text not null default 'manual',
  source_id text,
  source_url text,
  canonical_url text,
  posted_at timestamptz,
  discovered_at timestamptz not null default now(),
  last_verified_at timestamptz,
  eligibility text not null default 'unknown'
    check (eligibility in ('eligible', 'potentially_eligible', 'ineligible', 'unknown')),
  eligibility_reason text,
  eligibility_override boolean not null default false,
  fit_score int check (fit_score between 0 and 100),
  fit_details jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((deadline_status = 'stated') = (deadline is not null)),
  check (end_date is null or start_date is null or end_date >= start_date),
  unique (source, source_id),
  unique (canonical_url)
);

create table applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null unique references opportunities (id) on delete cascade,
  status text not null default 'discovered' check (status in (
    'discovered', 'to_review', 'ready_to_apply', 'applied', 'assessment',
    'interview', 'offer', 'rejected', 'withdrawn')),
  applied_at date,
  next_action text,
  next_action_due date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  organization text not null,
  name text not null check (length(trim(name)) > 0),
  role text,
  team text,
  email text,
  -- A guessed email is never 'verified'.
  email_status text not null default 'not_found'
    check (email_status in ('verified', 'unverified', 'not_found')),
  profile_url text,
  source_url text,
  researched_at date,
  relevance text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email is not null or email_status = 'not_found')
);

create table outreach (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities (id) on delete cascade,
  contact_id uuid references contacts (id) on delete restrict,
  style text not null check (style in ('recruiter', 'eng_manager', 'founder', 'professor')),
  status text not null default 'contact_needed' check (status in (
    'contact_needed', 'researching_contact', 'draft_ready', 'awaiting_approval',
    'sent', 'replied', 'follow_up_due', 'closed')),
  subject text,
  body text,
  sent_at timestamptz,
  replied_at timestamptz,
  follow_up_due date,
  gmail_draft_id text,
  gmail_message_id text,
  gmail_thread_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One outreach thread per (opportunity, contact); at most one "contact needed" placeholder.
  unique nulls not distinct (opportunity_id, contact_id),
  check (status not in ('sent', 'replied') or sent_at is not null)
);

create table events (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities (id) on delete cascade,
  application_id uuid references applications (id) on delete cascade,
  outreach_id uuid references outreach (id) on delete cascade,
  kind text not null check (kind in ('status_change', 'note', 'interview', 'response', 'discovery')),
  detail jsonb not null default '{}',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index opportunities_deadline_idx on opportunities (deadline) where deadline is not null;
create index opportunities_discovered_idx on opportunities (discovered_at desc);
create index outreach_contact_idx on outreach (contact_id);
create index events_opportunity_idx on events (opportunity_id, occurred_at desc);
create index events_occurred_idx on events (occurred_at desc);

create trigger profile_updated_at before update on profile
  for each row execute function set_updated_at();
create trigger opportunities_updated_at before update on opportunities
  for each row execute function set_updated_at();
create trigger applications_updated_at before update on applications
  for each row execute function set_updated_at();
create trigger contacts_updated_at before update on contacts
  for each row execute function set_updated_at();
create trigger outreach_updated_at before update on outreach
  for each row execute function set_updated_at();

alter table profile enable row level security;
alter table opportunities enable row level security;
alter table applications enable row level security;
alter table contacts enable row level security;
alter table outreach enable row level security;
alter table events enable row level security;
