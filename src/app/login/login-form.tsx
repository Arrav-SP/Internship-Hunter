"use client";

import { useActionState } from "react";
import { submitWith } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});
  return (
    <form noValidate onSubmit={submitWith(action)} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <div aria-live="polite">
        {state.message && <p role="alert" className="text-destructive text-sm">{state.message}</p>}
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}
