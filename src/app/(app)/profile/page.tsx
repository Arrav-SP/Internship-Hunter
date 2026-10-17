import { Suspense } from "react";
import { db } from "@/lib/db";
import type { Profile } from "@/lib/profile";
import { ProfileForm } from "./profile-form";

async function LoadedForm() {
  const supabase = await db();
  const { data, error } = await supabase.from("profile").select("*").eq("id", true).maybeSingle();
  if (error) throw new Error(`Failed to load profile: ${error.message}`);

  const row = data ?? {};
  const profile: Profile = {
    name: row.name ?? "",
    email: row.email ?? null,
    phone: row.phone ?? null,
    degree: row.degree ?? null,
    college: row.college ?? null,
    grad_year: row.grad_year ?? null,
    cgpa: row.cgpa ?? null,
    target_start: row.target_start ?? null,
    target_end: row.target_end ?? null,
    preferred_locations: row.preferred_locations ?? [],
    work_modes: row.work_modes ?? [],
    paid_only: row.paid_only ?? false,
    skills: row.skills ?? [],
    familiar_skills: row.familiar_skills ?? [],
    interests: row.interests ?? [],
    coursework: row.coursework ?? [],
    certifications: row.certifications ?? [],
    leadership: row.leadership ?? [],
    links: { github: null, linkedin: null, portfolio: null, resume: null, ...row.links },
    experiences: row.experiences ?? [],
    projects: row.projects ?? [],
  };
  return <ProfileForm profile={profile} version={row.updated_at ?? "new"} />;
}

export default function ProfilePage() {
  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <h1 className="mb-2 text-2xl font-semibold">Profile</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Used for matching and outreach. Only include things you can back up; drafts will cite them.
      </p>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <LoadedForm />
      </Suspense>
    </main>
  );
}
