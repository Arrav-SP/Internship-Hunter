// Profile validation shared by the profile page and scripts/seed-profile.ts.
// No path aliases or Next imports here: the seed script runs this file directly with Node.
import { z } from "zod";
import { httpUrl, lines, list, optionalText, orNull, splitList, str } from "./form.ts";

export { errorMap } from "./form.ts";

export const WORK_MODES = ["onsite", "hybrid", "remote"] as const;

export const experienceSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  organization: z.string().trim().min(1, "Organization is required"),
  location: optionalText,
  start: optionalText, // free text as written on the resume, e.g. "May 2026"
  end: optionalText,
  bullets: list,
});

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  tech: list,
  bullets: list,
  link: httpUrl.nullable(),
  // Where the description came from, so outreach never cites unverified claims.
  source: z.enum(["resume", "github", "manual"]),
});

export const profileSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    email: z.email().nullable(),
    phone: z.string().trim().regex(/^\+?[\d\s()-]{7,20}$/, "Use digits, spaces, dashes and an optional leading +").nullable(),
    degree: optionalText,
    college: optionalText,
    grad_year: z.number().int().min(2000).max(2100).nullable(),
    cgpa: z.number().min(0).max(10).nullable(),
    target_start: z.iso.date().nullable(),
    target_end: z.iso.date().nullable(),
    preferred_locations: list,
    work_modes: z.array(z.enum(WORK_MODES)),
    paid_only: z.boolean(),
    skills: list,
    familiar_skills: list,
    interests: list,
    coursework: list,
    certifications: list,
    leadership: list,
    links: z.object({
      github: httpUrl.nullable(),
      linkedin: httpUrl.nullable(),
      portfolio: httpUrl.nullable(),
      resume: httpUrl.nullable(),
    }),
    experiences: z.array(experienceSchema),
    projects: z.array(projectSchema),
  })
  .refine((p) => !p.target_start || !p.target_end || p.target_end >= p.target_start, {
    message: "Target end must be on or after target start",
    path: ["target_end"],
  });

export type Profile = z.infer<typeof profileSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Project = z.infer<typeof projectSchema>;

const num = (v: string) => (v ? Number(v) : null);

/** Collect repeated fieldsets named like "experiences.0.title" into arrays of string maps. */
function rows(form: FormData, prefix: string): Record<string, string>[] {
  const byIndex = new Map<number, Record<string, string>>();
  const re = new RegExp(`^${prefix}\\.(\\d+)\\.(\\w+)$`);
  for (const [key, value] of form) {
    const m = key.match(re);
    if (!m) continue;
    const row = byIndex.get(Number(m[1])) ?? {};
    row[m[2]] = str(value);
    byIndex.set(Number(m[1]), row);
  }
  return [...byIndex.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, row]) => row)
    // Drop rows marked for removal and the untouched blank "add" row.
    .filter((row) => !row.remove && Object.entries(row).some(([k, v]) => k !== "source" && v));
}

/** Turn the profile form's FormData into the shape profileSchema validates. */
export function parseProfileForm(form: FormData): unknown {
  return {
    name: str(form.get("name")),
    email: orNull(str(form.get("email"))),
    phone: orNull(str(form.get("phone"))),
    degree: orNull(str(form.get("degree"))),
    college: orNull(str(form.get("college"))),
    grad_year: num(str(form.get("grad_year"))),
    cgpa: num(str(form.get("cgpa"))),
    target_start: orNull(str(form.get("target_start"))),
    target_end: orNull(str(form.get("target_end"))),
    preferred_locations: splitList(str(form.get("preferred_locations"))),
    work_modes: form.getAll("work_modes").map(str),
    paid_only: form.get("paid_only") === "on",
    skills: splitList(str(form.get("skills"))),
    familiar_skills: splitList(str(form.get("familiar_skills"))),
    interests: splitList(str(form.get("interests"))),
    coursework: splitList(str(form.get("coursework"))),
    // Certifications and leadership entries contain commas, so they are one per line.
    certifications: lines(str(form.get("certifications"))),
    leadership: lines(str(form.get("leadership"))),
    links: {
      github: orNull(str(form.get("links.github"))),
      linkedin: orNull(str(form.get("links.linkedin"))),
      portfolio: orNull(str(form.get("links.portfolio"))),
      resume: orNull(str(form.get("links.resume"))),
    },
    experiences: rows(form, "experiences").map((r) => ({
      title: r.title ?? "",
      organization: r.organization ?? "",
      location: orNull(r.location ?? ""),
      start: orNull(r.start ?? ""),
      end: orNull(r.end ?? ""),
      bullets: lines(r.bullets ?? ""),
    })),
    projects: rows(form, "projects").map((r) => ({
      name: r.name ?? "",
      tech: splitList(r.tech ?? ""),
      bullets: lines(r.bullets ?? ""),
      link: orNull(r.link ?? ""),
      source: r.source || "manual",
    })),
  };
}
