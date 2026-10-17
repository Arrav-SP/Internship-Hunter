"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormErrors, SelectField, submitWith } from "@/components/field";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DEADLINE_STATUSES, ELIGIBILITIES, KINDS, label, LISTING_STATUSES, OPP_WORK_MODES, ROLE_CATEGORIES,
  type OpportunityRow,
} from "@/lib/opportunity";
import { createOpportunity, updateOpportunity, type OppFormState } from "./actions";

export function OpportunityForm({ opp }: { opp?: OpportunityRow }) {
  const [state, action, pending] = useActionState<OppFormState, FormData>(
    opp ? updateOpportunity.bind(null, opp.id) : createOpportunity,
    { errors: {} },
  );
  const { errors } = state;
  const v = (k: keyof OpportunityRow) => (opp?.[k] as string | null | undefined) ?? null;

  return (
    <form
      noValidate
      className="grid gap-8"
      onSubmit={submitWith(action)}
    >
      <div aria-live="polite">
        <FormErrors errors={errors} message={state.message} />
        {state.duplicateId && (
          <p className="mt-1 text-sm">
            <Link className="underline" href={`/opportunities/${state.duplicateId}`}>Open the existing record</Link>
          </p>
        )}
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-medium">Role</legend>
        <SelectField name="kind" label="Type" defaultValue={v("kind")} options={KINDS} optionLabel={label} errors={errors}
          hint="Speculative = no advertised opening; you'd reach out directly." />
        <SelectField name="role_category" label="Category" defaultValue={v("role_category")} options={ROLE_CATEGORIES} optionLabel={label} errors={errors} />
        <Field name="organization" label="Company or institution" defaultValue={v("organization")} errors={errors} required />
        <Field name="title" label="Title" defaultValue={v("title")} errors={errors} required />
        <Field name="location" label="Location" defaultValue={v("location")} errors={errors} />
        <SelectField name="work_mode" label="Work mode" defaultValue={v("work_mode") ?? "unknown"} options={OPP_WORK_MODES} optionLabel={label} errors={errors} />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-medium">Links</legend>
        <Field name="source_url" label="Listing URL" type="url" defaultValue={v("source_url")} errors={errors}
          hint="The page for this specific role. Used to detect duplicates." />
        <Field name="apply_url" label="Official application URL" type="url" defaultValue={v("apply_url")} errors={errors} />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-medium">Dates and pay</legend>
        <Field name="start_date" label="Start date" type="date" defaultValue={v("start_date")} errors={errors} />
        <Field name="end_date" label="End date" type="date" defaultValue={v("end_date")} errors={errors} />
        <Field name="duration_text" label="Duration as stated" defaultValue={v("duration_text")} errors={errors} hint='e.g. "10–12 weeks"' />
        <Field name="posted_at" label="Posted on" type="date" defaultValue={v("posted_at")?.slice(0, 10)} errors={errors} />
        <Field name="deadline" label="Application deadline" type="date" defaultValue={v("deadline")} errors={errors} />
        <SelectField name="deadline_status" label="If no deadline date" defaultValue={v("deadline_status") === "stated" ? "unknown" : v("deadline_status")}
          options={DEADLINE_STATUSES.filter((s) => s !== "stated")} optionLabel={label} errors={errors}
          hint="Unknown = not checked. None stated = the listing says rolling / gives no date." />
        <Field name="compensation_text" label="Compensation as stated" defaultValue={v("compensation_text")} errors={errors} hint="Leave blank if not stated" />
        <SelectField name="listing_status" label="Listing status" defaultValue={v("listing_status") ?? "unknown"} options={LISTING_STATUSES} optionLabel={label} errors={errors} />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-medium">Requirements and eligibility</legend>
        <div className="sm:col-span-2">
          <Field name="eligibility_text" label="Eligibility as stated" multiline defaultValue={v("eligibility_text")} errors={errors}
            hint="Copy the graduation-year / degree requirement word for word." />
        </div>
        <Field name="required_skills" label="Required skills" defaultValue={opp?.required_skills.join(", ")} errors={errors} hint="Comma-separated" />
        <Field name="preferred_skills" label="Preferred skills" defaultValue={opp?.preferred_skills.join(", ")} errors={errors} hint="Comma-separated" />
        <SelectField name="eligibility" label="Your eligibility" defaultValue={v("eligibility") ?? "unknown"} options={ELIGIBILITIES} optionLabel={label} errors={errors} />
        <Field name="eligibility_reason" label="Why" defaultValue={v("eligibility_reason")} errors={errors} />
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-2 text-lg font-medium">Details</legend>
        <Field name="description" label="Description" multiline defaultValue={v("description")} errors={errors} />
        <Field name="notes" label="Your notes" multiline defaultValue={v("notes")} errors={errors} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="verified" defaultChecked={!opp} />
          I checked this listing today (updates &ldquo;last verified&rdquo;)
        </label>
      </fieldset>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : opp ? "Save changes" : "Add opportunity"}</Button>
        <Link className={buttonVariants({ variant: "outline" })} href={opp ? `/opportunities/${opp.id}` : "/opportunities"}>Cancel</Link>
      </div>
    </form>
  );
}
