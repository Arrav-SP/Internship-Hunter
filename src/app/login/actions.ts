"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authClient } from "@/lib/auth";
import { str } from "@/lib/form";

export type LoginState = { message?: string };

const credentials = z.object({ email: z.email(), password: z.string().min(1).max(200) });

/** Only same-site paths, so ?next= can't send you to another site. */
const safeNext = (v: string) => (v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : "/");

export async function signIn(_prev: LoginState, form: FormData): Promise<LoginState> {
  const parsed = credentials.safeParse({ email: str(form.get("email")), password: form.get("password") });
  if (!parsed.success) return { message: "Enter your email and password." };
  const supabase = await authClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Same message for unknown email and wrong password, so it doesn't reveal which accounts exist.
    if (error.code === "invalid_credentials") return { message: "Wrong email or password." };
    if (error.status === 429) return { message: "Too many attempts. Wait a few minutes and try again." };
    return { message: `Sign-in failed: ${error.message}` }; // e.g. auth misconfigured; not account-specific
  }
  redirect(safeNext(str(form.get("next"))));
}

export async function signOut() {
  const supabase = await authClient();
  await supabase.auth.signOut();
  redirect("/login");
}
