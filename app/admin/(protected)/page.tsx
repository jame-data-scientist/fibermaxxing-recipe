import Link from "next/link";

import { adminCounts, pendingRecipes } from "@/lib/queries/admin";
import { formatDate, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminQueuePage() {
  const [counts, pending] = await Promise.all([adminCounts(), pendingRecipes()]);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Pending", value: counts.pending, href: "/admin" },
          { label: "Published", value: counts.approved, href: "/recipes" },
          { label: "Rejected", value: counts.rejected, href: "/admin" },
          { label: "Reports", value: counts.reports, href: "/admin/reports" },
          { label: "DMCA", value: counts.dmca, href: "/admin/dmca" },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="border border-line bg-paper-deep/30 px-4 py-3 hover:border-forest"
          >
            <p className="eyebrow">{stat.label}</p>
            <p className="mt-1 font-mono text-[24px]">{stat.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 flex items-baseline justify-between border-b border-line pb-3">
        <h1 className="eyebrow">Review queue</h1>
        <span className="font-mono text-[10px] text-moss">
          {pending.length} waiting
        </span>
      </div>

      {pending.length === 0 ? (
        <div className="mt-8 border border-dashed border-line-strong px-6 py-14 text-center">
          <p className="display text-2xl">Queue is clear.</p>
          <p className="mt-2 text-[13px] text-moss">
            New submissions appear here as they arrive.
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {pending.map((recipe) => {
            const flags: string[] = [];
            if (recipe.unmapped > 0) flags.push(`${recipe.unmapped} unmapped`);
            if (recipe.ingredientCount < 2) flags.push("under 2 ingredients");
            if (recipe.imageUrl && !recipe.imageRightsAttestedAt)
              flags.push("photo unattested");
            if (recipe.confidence !== "computed") flags.push("nutrition incomplete");

            return (
              <li key={recipe.id}>
                <Link
                  href={`/admin/recipes/${recipe.id}`}
                  className="group flex flex-wrap items-center gap-x-5 gap-y-2 py-4 hover:bg-paper-deep/30"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden border border-line bg-paper-deep">
                    {recipe.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={recipe.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-mono text-[9px] text-moss">
                        type
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">
                      {recipe.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-moss">
                      {recipe.authorName} · {recipe.authorCountryName} ·{" "}
                      {formatDate(recipe.submittedAt)}
                    </p>
                    {flags.length ? (
                      <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-rust">
                        {flags.join(" · ")}
                      </p>
                    ) : (
                      <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-forest">
                        ready to review
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-right font-mono text-[11px] text-moss">
                    <p>
                      {formatNumber(recipe.fiberG ?? 0)} g fibre
                      <br />
                      {formatNumber(recipe.proteinG ?? 0)} g protein
                    </p>
                  </div>

                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-forest group-hover:underline">
                    Review →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
