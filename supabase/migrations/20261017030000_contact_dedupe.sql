-- One record per person, so the resend guard (keyed on contact) can't be bypassed by a duplicate contact.
create unique index contacts_email_dedupe_idx on contacts (lower(email)) where email is not null;
create unique index contacts_name_org_dedupe_idx on contacts (lower(organization), lower(name));
