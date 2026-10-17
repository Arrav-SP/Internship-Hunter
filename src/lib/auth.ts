import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

/** Supabase client bound to the request's auth cookies (publishable key: it can only do what the user can). */
export async function authClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set in .env.local (see .env.example)");
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server Components can't set cookies; proxy.ts refreshes the session on the next request.
        }
      },
    },
  });
}

/** The signed-in user's verified claims, or a redirect to /login. Checked once per request. */
export const requireUser = cache(async () => {
  const supabase = await authClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/login");
  return data.claims;
});
