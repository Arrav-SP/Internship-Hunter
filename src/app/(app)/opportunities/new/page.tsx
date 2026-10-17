import { OpportunityForm } from "../opportunity-form";

export default function NewOpportunityPage() {
  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <h1 className="mb-2 text-2xl font-semibold">Add opportunity</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Copy details from the listing. Leave anything that isn&apos;t stated blank rather than guessing.
      </p>
      <OpportunityForm />
    </main>
  );
}
