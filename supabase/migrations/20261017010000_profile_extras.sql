-- Extra profile fields for outreach and matching.
alter table profile
  add column phone text,
  -- Skills used with heavy AI assistance: counted for matching, not claimed as expertise in drafts.
  add column familiar_skills text[] not null default '{}',
  add column coursework text[] not null default '{}',
  add column certifications text[] not null default '{}',
  add column leadership text[] not null default '{}',
  add column paid_only boolean not null default false;
