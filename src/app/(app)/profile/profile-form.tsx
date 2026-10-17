"use client";

import { useActionState } from "react";
import { Field, FormErrors, submitWith } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { WORK_MODES, type Experience, type Profile, type Project } from "@/lib/profile";
import { saveProfile, type SaveState } from "./actions";

const EMPTY_EXPERIENCE: Experience = { title: "", organization: "", location: null, start: null, end: null, bullets: [] };
const EMPTY_PROJECT: Project = { name: "", tech: [], bullets: [], link: null, source: "manual" };

export function ProfileForm({ profile, version }: { profile: Profile; version: string }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveProfile, { errors: {}, saved: false });
  const { errors } = state;
  // Existing rows plus one blank row for adding a new entry.
  const experiences = [...profile.experiences, EMPTY_EXPERIENCE];
  const projects = [...profile.projects, EMPTY_PROJECT];

  return (
    <form
      // Remount the fields after each save so they show the normalised, saved values.
      // Keyed here (not on ProfileForm) so the "saved" state above survives the remount.
      key={version}
      noValidate
      className="grid gap-8"
      onSubmit={submitWith(action)}
    >
      <div aria-live="polite">
        {state.saved && !pending && <p className="text-sm text-green-700 dark:text-green-400">Profile saved.</p>}
        <FormErrors errors={errors} message={state.message} />
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-medium">Basics</legend>
        <Field name="name" label="Name" defaultValue={profile.name} errors={errors} required />
        <Field name="email" label="Email" type="email" defaultValue={profile.email} errors={errors} />
        <Field name="phone" label="Phone" type="tel" defaultValue={profile.phone} errors={errors} />
        <Field name="degree" label="Degree" defaultValue={profile.degree} errors={errors} />
        <Field name="college" label="College" defaultValue={profile.college} errors={errors} />
        <Field name="grad_year" label="Graduation year" type="number" defaultValue={profile.grad_year} errors={errors} />
        <Field name="cgpa" label="CGPA (out of 10)" type="number" step="0.01" defaultValue={profile.cgpa} errors={errors} />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-medium">Internship preferences</legend>
        <Field name="target_start" label="Target start" type="date" defaultValue={profile.target_start} errors={errors} />
        <Field name="target_end" label="Target end" type="date" defaultValue={profile.target_end} errors={errors} />
        <Field
          name="preferred_locations"
          label="Preferred locations"
          defaultValue={profile.preferred_locations.join(", ")}
          errors={errors}
          hint="Comma-separated"
        />
        <div className="grid gap-1.5">
          <span className="text-sm font-medium">Work modes</span>
          <div className="flex gap-4">
            {WORK_MODES.map((mode) => (
              <label key={mode} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="work_modes" value={mode} defaultChecked={profile.work_modes.includes(mode)} />
                {mode}
              </label>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="paid_only" defaultChecked={profile.paid_only} />
          Paid roles only (unpaid roles get deprioritised)
        </label>
        <div className="sm:col-span-2">
          <Field name="interests" label="Interests" multiline defaultValue={profile.interests.join(", ")} errors={errors} hint="Comma-separated" />
        </div>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-2 text-lg font-medium">Skills and background</legend>
        <Field
          name="skills"
          label="Core skills"
          multiline
          defaultValue={profile.skills.join(", ")}
          errors={errors}
          hint="Comma-separated. Skills you can defend in an interview; drafts may cite these."
        />
        <Field
          name="familiar_skills"
          label="Familiar skills"
          multiline
          defaultValue={profile.familiar_skills.join(", ")}
          errors={errors}
          hint="Comma-separated. Used for matching; drafts won't present these as expertise."
        />
        <Field name="coursework" label="Coursework" multiline defaultValue={profile.coursework.join(", ")} errors={errors} hint="Comma-separated" />
        <Field name="certifications" label="Certifications" multiline defaultValue={profile.certifications.join("\n")} errors={errors} hint="One per line" />
        <Field name="leadership" label="Leadership and activities" multiline defaultValue={profile.leadership.join("\n")} errors={errors} hint="One per line" />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-medium">Links</legend>
        {(["github", "linkedin", "portfolio", "resume"] as const).map((key) => (
          <Field key={key} name={`links.${key}`} label={key[0].toUpperCase() + key.slice(1)} type="url" defaultValue={profile.links[key]} errors={errors} />
        ))}
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-2 text-lg font-medium">Experience</legend>
        {experiences.map((exp, i) => {
          const isNew = i === experiences.length - 1;
          const p = `experiences.${i}`;
          return (
            <div key={i} className="grid gap-3 rounded-md border p-4 sm:grid-cols-2">
              <p className="text-muted-foreground text-sm sm:col-span-2">{isNew ? "Add experience (leave blank to skip)" : `Experience ${i + 1}`}</p>
              <Field name={`${p}.title`} label="Title" defaultValue={exp.title} errors={errors} />
              <Field name={`${p}.organization`} label="Organization" defaultValue={exp.organization} errors={errors} />
              <Field name={`${p}.location`} label="Location" defaultValue={exp.location} errors={errors} />
              <div className="grid grid-cols-2 gap-3">
                <Field name={`${p}.start`} label="Start" defaultValue={exp.start} errors={errors} />
                <Field name={`${p}.end`} label="End" defaultValue={exp.end} errors={errors} />
              </div>
              <div className="sm:col-span-2">
                <Field name={`${p}.bullets`} label="Bullets" multiline defaultValue={exp.bullets.join("\n")} errors={errors} hint="One per line" />
              </div>
              {!isNew && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name={`${p}.remove`} /> Remove this experience
                </label>
              )}
            </div>
          );
        })}
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-2 text-lg font-medium">Projects</legend>
        {projects.map((proj, i) => {
          const isNew = i === projects.length - 1;
          const p = `projects.${i}`;
          return (
            <div key={i} className="grid gap-3 rounded-md border p-4 sm:grid-cols-2">
              <p className="text-muted-foreground text-sm sm:col-span-2">{isNew ? "Add project (leave blank to skip)" : `Project ${i + 1}`}</p>
              <Field name={`${p}.name`} label="Name" defaultValue={proj.name} errors={errors} />
              <Field name={`${p}.link`} label="Link" type="url" defaultValue={proj.link} errors={errors} />
              <Field name={`${p}.tech`} label="Tech" defaultValue={proj.tech.join(", ")} errors={errors} hint="Comma-separated" />
              <div className="grid gap-1.5">
                <Label htmlFor={`${p}.source`}>Description source</Label>
                <select
                  id={`${p}.source`}
                  name={`${p}.source`}
                  defaultValue={proj.source}
                  className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                >
                  <option value="resume">Resume</option>
                  <option value="github">GitHub</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Field name={`${p}.bullets`} label="Description" multiline defaultValue={proj.bullets.join("\n")} errors={errors} hint="One point per line" />
              </div>
              {!isNew && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name={`${p}.remove`} /> Remove this project
                </label>
              )}
            </div>
          );
        })}
      </fieldset>

      <div>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</Button>
      </div>
    </form>
  );
}
