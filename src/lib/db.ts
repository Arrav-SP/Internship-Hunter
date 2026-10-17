import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "./auth";

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

// The secret key bypasses RLS, so this client must only ever run on the server.
const client =
  url && secretKey ? createClient(url, secretKey, { auth: { persistSession: false } }) : null;

/**
 * Server-side Supabase client for app data. Every call first checks the signed-in user, so pages,
 * Server Actions and route handlers can't read or write data without a session, whatever proxy.ts did.
 */
export async function db() {
  await requireUser();
  if (!client) {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local (see .env.example)");
  }
  return client;
}
