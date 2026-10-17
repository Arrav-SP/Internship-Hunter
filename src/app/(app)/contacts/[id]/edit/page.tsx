import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { ContactForm, type ContactRow } from "../../contact-form";
import { DeleteContact } from "./delete-contact";

export default async function EditContactPage({ params }: PageProps<"/contacts/[id]/edit">) {
  // Load before returning any JSX: notFound() must run before the response starts streaming.
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await db();
  const { data, error } = await supabase.from("contacts").select("*").eq("id", id).maybeSingle<ContactRow>();
  if (error) throw new Error(`Failed to load contact: ${error.message}`);
  if (!data) notFound();
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Edit: {data.name}</h1>
        <DeleteContact id={data.id} name={data.name} />
      </div>
      <ContactForm contact={data} />
    </main>
  );
}
