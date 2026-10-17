"use client";

import { Button } from "@/components/ui/button";
import { deleteOpportunity } from "../actions";

export function DeleteButton({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={deleteOpportunity.bind(null, id)}
      onSubmit={(e) => {
        if (!confirm(`Delete "${title}"? Its application tracking, outreach and history are deleted too.`)) e.preventDefault();
      }}
    >
      <Button type="submit" variant="destructive">Delete</Button>
    </form>
  );
}
