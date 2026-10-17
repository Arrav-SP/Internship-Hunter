import { startTransition } from "react";
import { Input } from "@/components/ui/input";

/**
 * onSubmit handler that runs a useActionState action in a transition. Unlike `action=`, this doesn't
 * reset the form, so a failed validation keeps what the user typed.
 */
export const submitWith = (action: (data: FormData) => void) => (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  startTransition(() => action(data));
};
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// idPrefix keeps ids unique when several forms on one page share field names.
type Common = { name: string; label: string; errors: Record<string, string>; hint?: string; idPrefix?: string };

function useDescribed(id: string, name: string, errors: Record<string, string>, hint?: string) {
  const error = errors[name];
  return { error, "aria-invalid": !!error, "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined };
}

function Help({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error) return <p id={`${id}-error`} className="text-destructive text-xs">{error}</p>;
  return hint ? <p id={`${id}-hint`} className="text-muted-foreground text-xs">{hint}</p> : null;
}

type FieldProps = Common & {
  defaultValue?: string | number | null;
  multiline?: boolean;
} & Omit<React.ComponentProps<"input">, "defaultValue" | "name">;

export function Field({ name, label, defaultValue, errors, hint, multiline, idPrefix = "", ...rest }: FieldProps) {
  const id = idPrefix + name;
  const { error, ...aria } = useDescribed(id, name, errors, hint);
  const common = { id, name, defaultValue: defaultValue ?? "", ...aria };
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {multiline ? <Textarea rows={3} {...common} /> : <Input {...common} {...rest} />}
      <Help id={id} error={error} hint={hint} />
    </div>
  );
}

type SelectProps = Common & { defaultValue?: string | null; options: readonly string[]; optionLabel: (v: string) => string };

export function SelectField({ name, label, defaultValue, errors, hint, options, optionLabel, idPrefix = "" }: SelectProps) {
  const id = idPrefix + name;
  const { error, ...aria } = useDescribed(id, name, errors, hint);
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue ?? options[0]}
        className="border-input bg-background h-9 rounded-md border px-3 text-sm"
        {...aria}
      >
        {options.map((o) => (
          <option key={o} value={o}>{optionLabel(o)}</option>
        ))}
      </select>
      <Help id={id} error={error} hint={hint} />
    </div>
  );
}

/** Summary of a failed submit, announced to screen readers. */
export function FormErrors({ errors, message }: { errors: Record<string, string>; message?: string }) {
  const entries = Object.entries(errors);
  return (
    <>
      {message && <p role="alert" className="text-destructive text-sm">{message}</p>}
      {entries.length > 0 && (
        <div role="alert" className="border-destructive text-destructive rounded-md border p-3 text-sm">
          <p className="font-medium">Fix {entries.length} field{entries.length > 1 ? "s" : ""}:</p>
          <ul className="list-disc pl-5">
            {entries.map(([path, msg]) => <li key={path}>{path}: {msg}</li>)}
          </ul>
        </div>
      )}
    </>
  );
}
