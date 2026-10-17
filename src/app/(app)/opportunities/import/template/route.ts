import { toCsv } from "@/lib/csv";
import { OPPORTUNITY_COLUMNS } from "@/lib/opportunity";

export function GET() {
  return new Response(toCsv([], [...OPPORTUNITY_COLUMNS]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="opportunities-template.csv"',
    },
  });
}
