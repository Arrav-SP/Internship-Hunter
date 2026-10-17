"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <h1 className="mb-2 text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground mb-4 text-sm">
        {error instanceof Error ? error.message : "Unexpected error."} If the database is down, run{" "}
        <code>npm run db:start</code>.
      </p>
      <Button onClick={() => retry()}>Try again</Button>
    </main>
  );
}
