"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormErrors, SelectField, submitWith } from "@/components/field";
import { Button, buttonVariants } from "@/components/ui/button";
import { todayIST } from "@/lib/format";
import { label } from "@/lib/opportunity";
import { EMAIL_STATUSES } from "@/lib/tracking";
import { createContact, updateContact, type ContactFormState } from "./actions";

export type ContactRow = {
  id: string; organization: string; name: string; role: string | null; team: string | null; email: string | null;
  email_status: string; profile_url: string | null; source_url: string | null; researched_at: string | null;
  relevance: string | null; notes: string | null;
};

export function ContactForm({ contact, organization, returnTo }: { contact?: ContactRow; organization?: string; returnTo?: string }) {
  const [state, action, pending] = useActionState<ContactFormState, FormData>(
    contact ? updateContact.bind(null, contact.id) : createContact,
    { errors: {} },
  );
  const { errors } = state;
  const today = todayIST();

  return (
    <form
      noValidate
      className="grid gap-6"
      onSubmit={submitWith(action)}
    >
      {returnTo && <input type="hidden" name="return_to" value={returnTo} />}
      <div aria-live="polite">
        <FormErrors errors={errors} message={state.message} />
        {state.duplicateId && (
          <p className="mt-1 text-sm">
            <Link className="underline" href={`/contacts/${state.duplicateId}/edit`}>Open the existing contact</Link>
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Name" defaultValue={contact?.name} errors={errors} required />
        <Field name="organization" label="Organization" defaultValue={contact?.organization ?? organization} errors={errors} required />
        <Field name="role" label="Current role" defaultValue={contact?.role} errors={errors} />
        <Field name="team" label="Team" defaultValue={contact?.team} errors={errors} />
        <Field name="email" label="Public professional email" type="email" defaultValue={contact?.email} errors={errors}
          hint="Only an address the person or organization publishes. Never a guessed pattern." />
        <SelectField name="email_status" label="Email status" defaultValue={contact?.email_status ?? "not_found"} options={EMAIL_STATUSES}
          optionLabel={label} errors={errors}
          hint="Verified = published by them / their org, or confirmed by a verifier. Otherwise Unverified." />
        <Field name="profile_url" label="LinkedIn or official profile" type="url" defaultValue={contact?.profile_url} errors={errors} />
        <Field name="source_url" label="Where you found them" type="url" defaultValue={contact?.source_url} errors={errors} />
        <Field name="researched_at" label="Researched on" type="date" defaultValue={contact?.researched_at ?? today} errors={errors} />
        <Field name="relevance" label="Why they're relevant" defaultValue={contact?.relevance} errors={errors} />
      </div>
      <Field name="notes" label="Notes" multiline defaultValue={contact?.notes} errors={errors} />
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : contact ? "Save contact" : "Add contact"}</Button>
        <Link className={buttonVariants({ variant: "outline" })} href={returnTo ?? "/contacts"}>Cancel</Link>
      </div>
    </form>
  );
}
