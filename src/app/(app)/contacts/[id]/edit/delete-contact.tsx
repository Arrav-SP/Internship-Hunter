"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteContact } from "../../actions";

export function DeleteContact({ id, name }: { id: string; name: string }) {
  const [message, setMessage] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <div className="grid justify-items-end gap-1">
      <Button
        variant="destructive"
        disabled={pending}
        onClick={() => {
          if (confirm(`Delete contact "${name}"?`)) start(async () => setMessage((await deleteContact(id))?.message));
        }}
      >
        Delete
      </Button>
      {message && <p role="alert" className="text-destructive text-xs">{message}</p>}
    </div>
  );
}
