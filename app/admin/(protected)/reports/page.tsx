import Link from "next/link";

import { resolveReport } from "@/app/actions/admin";
import { openReports } from "@/lib/queries/admin";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const reports = await openReports();

  return (
    <div>
      <div className="flex items-baseline justify-between border-b border-line pb-3">
        <h1 className="display text-3xl">Reports</h1>
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-moss">
          {reports.length} open
        </span>
      </div>

      {reports.length === 0 ? (
        <div className="mt-8 border border-dashed border-line-strong px-6 py-14 text-center">
          <p className="display text-2xl">No open reports.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-4">
          {reports.map((report) => (
            <li key={report.id} className="border border-line p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-[14px] font-medium">{report.title}</p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-moss">
                    {report.kind} · {formatDate(report.createdAt)} · recipe is{" "}
                    {report.status}
                  </p>
                </div>
                <Link
                  href={`/recipes/${report.slug}`}
                  className="font-mono text-[10px] uppercase tracking-[0.08em] text-forest underline"
                >
                  Open recipe →
                </Link>
              </div>

              {report.note ? (
                <p className="mt-3 border-l-2 border-line-strong pl-3 text-[13px] leading-relaxed text-ink/80">
                  {report.note}
                </p>
              ) : null}

              <form action={resolveReport} className="mt-4 flex gap-2">
                <input type="hidden" name="id" value={report.id} />
                <button
                  type="submit"
                  name="action"
                  value="unpublish"
                  className="rounded-full bg-forest px-4 py-1.5 text-[11px] text-paper hover:bg-forest-soft"
                >
                  Unpublish recipe
                </button>
                <button
                  type="submit"
                  name="action"
                  value="dismiss"
                  className="rounded-full border border-line-strong px-4 py-1.5 text-[11px] text-moss hover:border-ink hover:text-ink"
                >
                  Dismiss
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
