// Load private/profile.json into the single profile row.
// Usage: npm run seed:profile  (runs with Node's built-in TypeScript support and .env.local)
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { errorMap, profileSchema } from "../src/lib/profile.ts";

const file = process.argv[2] ?? "private/profile.json";
const result = profileSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
if (!result.success) {
  console.error(`${file} is invalid:`);
  for (const [path, message] of Object.entries(errorMap(result.error))) console.error(`  ${path}: ${message}`);
  process.exit(1);
}

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { error } = await supabase.from("profile").upsert({ id: true, ...result.data });
if (error) {
  console.error(`Failed to save profile: ${error.message}`);
  process.exit(1);
}
console.log(
  `Profile saved: ${result.data.name} (${result.data.experiences.length} experiences, ${result.data.projects.length} projects)`,
);
