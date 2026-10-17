// Create the app's single login, or reset its password. Sign-ups are disabled, so this is the only way in.
// Usage: npm run create-user   (prompts for email and password; the password is not echoed)
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createClient } from "@supabase/supabase-js";

async function ask(question: string, hidden = false): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });
  if (hidden) {
    // Echo nothing while the password is typed.
    const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput.bind(rl);
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s) => {
      if (s.startsWith(question)) write(s);
    };
  }
  const answer = await rl.question(question);
  rl.close();
  if (hidden) stdout.write("\n");
  return answer.trim();
}

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local");
  process.exit(1);
}
const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } }).auth.admin;

const email = (process.env.APP_USER_EMAIL ?? (await ask("Email: "))).toLowerCase();
const password = process.env.APP_USER_PASSWORD ?? (await ask("Password (12+ characters): ", true));
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("That doesn't look like an email address.");
  process.exit(1);
}
if (password.length < 12) {
  console.error("Use at least 12 characters.");
  process.exit(1);
}

const { data: list, error: listError } = await admin.listUsers({ perPage: 1000 });
if (listError) {
  console.error(`Could not list users: ${listError.message}`);
  process.exit(1);
}
const existing = list.users.find((u) => u.email?.toLowerCase() === email);
const { error } = existing
  ? await admin.updateUserById(existing.id, { password })
  : await admin.createUser({ email, password, email_confirm: true });
if (error) {
  console.error(`Failed: ${error.message}`);
  process.exit(1);
}
console.log(existing ? `Password reset for ${email}.` : `Created ${email}. Sign in at /login.`);
const others = list.users.filter((u) => u.email?.toLowerCase() !== email).map((u) => u.email);
if (others.length) console.warn(`Note: other accounts exist and can also sign in: ${others.join(", ")}`);
