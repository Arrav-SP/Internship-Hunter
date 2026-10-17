import { Suspense } from "react";
import { LoginForm } from "./login-form";

async function Form({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const next = (await searchParams).next;
  return <LoginForm next={typeof next === "string" ? next : "/"} />;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto w-full max-w-sm p-6 pt-24">
      <h1 className="mb-6 text-2xl font-semibold">Internship Hunter</h1>
      <Suspense>
        <Form searchParams={searchParams} />
      </Suspense>
      <p className="text-muted-foreground mt-6 text-xs">Single-user app. Create the account with <code>npm run create-user</code>.</p>
    </main>
  );
}
