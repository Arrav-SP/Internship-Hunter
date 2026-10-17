-- Every opportunity gets its application row and a discovery event, however it was created
-- (manual entry, CSV import, discovery pipeline).
create or replace function opportunity_created() returns trigger
language plpgsql as $$
declare
  app_id uuid;
begin
  insert into applications (opportunity_id) values (new.id) returning id into app_id;
  insert into events (opportunity_id, application_id, kind, detail)
    values (new.id, app_id, 'discovery', jsonb_build_object('source', new.source));
  return new;
end;
$$;

create trigger opportunities_created after insert on opportunities
  for each row execute function opportunity_created();

-- Records without a URL (e.g. speculative targets) dedupe on kind + organization + title.
create unique index opportunities_no_url_dedupe_idx
  on opportunities (kind, lower(organization), lower(title))
  where canonical_url is null;
