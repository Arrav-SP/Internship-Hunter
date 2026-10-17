import { loadOpportunity } from "../../load";
import { OpportunityForm } from "../../opportunity-form";


export default async function EditOpportunityPage({ params }: PageProps<"/opportunities/[id]/edit">) {
  // Load before returning any JSX: notFound() must run before the response starts streaming.
  const opp = await loadOpportunity((await params).id);
  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Edit: {opp.title}</h1>
      <OpportunityForm opp={opp} />
    </main>
  );
}
