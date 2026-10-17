-- Ensure the single profile row exists. Personal data is loaded separately
-- from the git-ignored private/profile.json (npm run seed:profile).
insert into profile (id) values (true) on conflict do nothing;
