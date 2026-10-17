"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { Field, FormErrors, SelectField, submitWith } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { APPLICATION_STATUSES } from "@/lib/filters";
import { label } from "@/lib/opportunity";
import { LOG_KINDS, OUTREACH_STATUSES, OUTREACH_STYLES } from "@/lib/tracking";
import { addOutreach, logEvent, updateApplication, updateOutreach, type TrackState } from "./tracking-actions";

const INITIAL: TrackState = { errors: {} };

function Status({ state, pending, savedText = "Saved." }: { state: TrackState; pending: boolean; savedText?: string }) {
  return (
    <div aria-live="polite">
      {state.saved && !pending && <p className="text-sm text-green-700 dark:text-green-400">{savedText}</p>}
      <FormErrors errors={state.errors} message={state.message} />
    </div>
  );
}

/** Clears an "add" form after a successful save. */
function useResetOnSave(state: TrackState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.saved) ref.current?.reset();
  }, [state]);
  return ref;
}

export type ApplicationData = { updated_at: string; status: string; applied_at: string | null; next_action: string | null; next_action_due: string | null; notes: string | null };

export function ApplicationPanel({ opportunityId, app }: { opportunityId: string; app: ApplicationData }) {
  const [state, action, pending] = useActionState(updateApplication.bind(null, opportunityId), INITIAL);
  const e = state.errors;
  return (
    // Keyed on updated_at so server-filled values (e.g. applied date) show after save; state lives above the key.
    <form key={app.updated_at} noValidate onSubmit={submitWith(action)} className="grid gap-4 sm:grid-cols-2" aria-label="Application">
      <div className="sm:col-span-2"><Status state={state} pending={pending} /></div>
      <SelectField idPrefix="app-" name="status" label="Status" defaultValue={app.status} options={APPLICATION_STATUSES} optionLabel={label} errors={e} />
      <Field idPrefix="app-" name="applied_at" label="Applied on" type="date" defaultValue={app.applied_at} errors={e} hint="Filled with today when you mark it Applied" />
      <Field idPrefix="app-" name="next_action" label="Next action" defaultValue={app.next_action} errors={e} />
      <Field idPrefix="app-" name="next_action_due" label="Due" type="date" defaultValue={app.next_action_due} errors={e} />
      <div className="sm:col-span-2"><Field idPrefix="app-" name="notes" label="Notes" multiline defaultValue={app.notes} errors={e} /></div>
      <div><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save application"}</Button></div>
    </form>
  );
}

export function LogForm({ opportunityId }: { opportunityId: string }) {
  const [state, action, pending] = useActionState(logEvent.bind(null, opportunityId), INITIAL);
  const ref = useResetOnSave(state);
  const e = state.errors;
  return (
    <form ref={ref} noValidate onSubmit={submitWith(action)} className="grid gap-3 sm:grid-cols-[10rem_10rem_1fr_auto] sm:items-end" aria-label="Log activity">
      <SelectField idPrefix="log-" name="kind" label="Log" options={LOG_KINDS} optionLabel={(v) => ({ note: "Note", interview: "Interview", response: "Recruiter response" })[v] ?? v} errors={e} />
      <Field idPrefix="log-" name="occurred_on" label="Date" type="date" errors={e} hint="Blank = now" />
      <Field idPrefix="log-" name="text" label="What happened" errors={e} />
      <Button type="submit" disabled={pending}>Add</Button>
      <div className="sm:col-span-4"><Status state={state} pending={pending} savedText="Logged." /></div>
    </form>
  );
}

export type ContactOption = { id: string; name: string; organization: string; email: string | null; email_status: string };
export type OutreachData = {
  id: string; updated_at: string; contact_id: string | null; style: string; status: string; subject: string | null; body: string | null;
  follow_up_due: string | null; notes: string | null;
};

export function OutreachForm({ opportunityId, organization, contacts, outreach }: {
  opportunityId: string; organization: string; contacts: ContactOption[]; outreach?: OutreachData;
}) {
  const [state, action, pending] = useActionState(
    outreach ? updateOutreach.bind(null, opportunityId, outreach.id) : addOutreach.bind(null, opportunityId),
    INITIAL,
  );
  const ref = useResetOnSave(outreach ? INITIAL : state);
  const e = state.errors;
  const prefix = outreach ? `o-${outreach.id}-` : "new-";
  // Same-organization contacts first.
  const sorted = [...contacts].sort((a, b) => Number(b.organization === organization) - Number(a.organization === organization));

  return (
    <form key={outreach?.updated_at} ref={ref} noValidate onSubmit={submitWith(action)} className="grid gap-4 sm:grid-cols-2" aria-label={outreach ? "Edit outreach" : "Add outreach"}>
      <div className="sm:col-span-2"><Status state={state} pending={pending} /></div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}contact_id`}>Contact</Label>
        <select id={`${prefix}contact_id`} name="contact_id" defaultValue={outreach?.contact_id ?? ""} className="border-input bg-background h-9 rounded-md border px-3 text-sm">
          <option value="">No contact yet</option>
          {sorted.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.organization}){c.email ? ` · ${label(c.email_status)} email` : " · no email"}</option>
          ))}
        </select>
        <Link className="text-xs underline" href={`/contacts/new?organization=${encodeURIComponent(organization)}&return_to=/opportunities/${opportunityId}`}>
          New contact
        </Link>
      </div>
      <SelectField idPrefix={prefix} name="style" label="Email style" defaultValue={outreach?.style} options={OUTREACH_STYLES} optionLabel={label} errors={e} />
      <SelectField idPrefix={prefix} name="status" label="Status" defaultValue={outreach?.status ?? "contact_needed"} options={OUTREACH_STATUSES} optionLabel={label} errors={e}
        hint="Mark Sent only after you've actually sent it." />
      <Field idPrefix={prefix} name="follow_up_due" label="Follow up on" type="date" defaultValue={outreach?.follow_up_due} errors={e} />
      <div className="sm:col-span-2"><Field idPrefix={prefix} name="subject" label="Subject" defaultValue={outreach?.subject} errors={e} /></div>
      <div className="sm:col-span-2"><Field idPrefix={prefix} name="body" label="Body" multiline defaultValue={outreach?.body} errors={e} /></div>
      <div className="sm:col-span-2"><Field idPrefix={prefix} name="notes" label="Notes" defaultValue={outreach?.notes} errors={e} /></div>
      {state.needsConfirm && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="confirm_resend" /> Send anyway: I mean to email this person again
        </label>
      )}
      <div><Button type="submit" disabled={pending}>{pending ? "Saving…" : outreach ? "Save outreach" : "Add outreach"}</Button></div>
    </form>
  );
}
