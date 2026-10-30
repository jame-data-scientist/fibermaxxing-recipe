import Link from "next/link";

import { handleDmca } from "@/app/actions/admin";
import { dmcaList } from "@/lib/queries/admin";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDmcaPage() {
  const notices = await dmcaList();

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="display text-3xl">DMCA notices</h1>
          <p className="mt-1 text-[13px] text-moss">
            Notices received through the public form. Upholding one unpublishes
            the recipe and records a strike.
          </p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-moss">
          {notices.filter((notice) => notice.status === "received").length} open
        </span>
      </div>

      {notices.length === 0 ? (
        <div className="mt-8 border border-dashed border-line-strong px-6 py-14 text-center">
          <p className="display text-2xl">No notices.</p>
          <p className="mt-2 text-[13px] text-moss">
            Nothing has been reported under the copyright process.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-4">
          {notices.map((notice) => (
            <li key={notice.id} className="border border-line p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[14px] font-medium">
                  {notice.claimantName}{" "}
                  <span className="font-normal text-moss">
                    &lt;{notice.claimantEmail}&gt;
                  </span>
                </p>
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-moss">
                  {notice.status} · {formatDate(notice.receivedAt)}
                </span>
              </div>

              <p className="mt-2 text-[13px] leading-relaxed text-ink/85">
                {notice.workDescription}
              </p>
              <p className="mt-1 break-all font-mono text-[11px] text-moss">
                {notice.infringingUrl}
              </p>

              {notice.recipeTitle ? (
                <p className="mt-2 text-[12px]">
                  Matched recipe:{" "}
                  <Link
                    href={`/recipes/${notice.recipeSlug}`}
                    className="text-forest underline"
                  >
                    {notice.recipeTitle}
                  </Link>
                </p>
              ) : (
                <p className="mt-2 text-[12px] text-rust">
                  No recipe matched this URL — check it manually.
                </p>
              )}

              {notice.status === "received" ? (
                <form action={handleDmca} className="mt-4 flex gap-2">
                  <input type="hidden" name="id" value={notice.id} />
                  <button
                    type="submit"
                    name="action"
                    value="uphold"
                    className="rounded-full bg-rust px-4 py-1.5 text-[11px] text-paper hover:opacity-90"
                  >
                    Uphold & remove
                  </button>
                  <button
                    type="submit"
                    name="action"
                    value="reject"
                    className="rounded-full border border-line-strong px-4 py-1.5 text-[11px] text-moss hover:border-ink hover:text-ink"
                  >
                    Reject claim
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
