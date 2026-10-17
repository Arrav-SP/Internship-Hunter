// Small validation and FormData helpers shared by the profile and opportunity forms.
// Imported with explicit .ts extensions so scripts can run these files directly with Node.
import { z } from "zod";

export const httpUrl = z
  .string()
  .trim()
  .refine((v) => /^https?:\/\//i.test(v) && URL.canParse(v), "Must be an http(s) URL");
export const optionalText = z.string().trim().min(1).nullable();
export const list = z.array(z.string().trim().min(1)).transform((items) => [...new Set(items)]);

/** Field path -> first error message, e.g. { "experiences.0.title": "Title is required" }. */
export function errorMap(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[issue.path.join(".")] ??= issue.message;
  return out;
}

export const str = (v: FormDataEntryValue | null | undefined) => (typeof v === "string" ? v.trim() : "");
export const orNull = (v: string) => v || null;
export const splitList = (v: string) => v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
export const lines = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);
