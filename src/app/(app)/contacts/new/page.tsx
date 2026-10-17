import { Suspense } from "react";
import { ContactForm } from "../contact-form";

async function Form({ searchParams }: { searchParams: PageProps<"/contacts/new">["searchParams"] }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const returnTo = one(sp.return_to);
  // Only return to an opportunity page; never redirect off-site.
  return <ContactForm organization={one(sp.organization)} returnTo={returnTo?.startsWith("/opportunities/") ? returnTo : undefined} />;
}

export default function NewContactPage({ searchParams }: PageProps<"/contacts/new">) {
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <h1 className="mb-2 text-2xl font-semibold">Add contact</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Use public professional information only. If you can&apos;t find the right person, leave the outreach as
        &ldquo;contact needed&rdquo; rather than guessing.
      </p>
      <Suspense>
        <Form searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
