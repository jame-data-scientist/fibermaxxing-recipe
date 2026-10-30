import { MapAllForm } from "@/components/admin/ingredient-mapper";
import { mappingQueue } from "@/lib/queries/admin";

export const dynamic = "force-dynamic";

export default async function AdminFoodsPage({
  searchParams,
}: {
  searchParams: Promise<{ mapped?: string; skipped?: string }>;
}) {
  const query = await searchParams;
  const queue = await mappingQueue();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-3">
        <div>
          <h1 className="display text-3xl">Food mapping</h1>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-moss">
            Every unmapped ingredient, grouped by the text the cook typed.
            Mapping one row fixes every recipe that used the same phrase and
            recomputes their nutrition.
          </p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-moss">
          {queue.length} phrases
        </span>
      </div>

      {query.mapped ? (
        <div className="mt-4 border-l-2 border-lime bg-lime-soft/30 px-4 py-3 text-[13px] text-forest">
          Mapped {query.mapped} ingredient{query.mapped === "1" ? "" : "s"}
          {query.skipped && query.skipped !== "0"
            ? ` · ${query.skipped} skipped because the unit had no measured weight`
            : ""}
          .
        </div>
      ) : null}

      {queue.length === 0 ? (
        <div className="mt-8 border border-dashed border-line-strong px-6 py-14 text-center">
          <p className="display text-2xl">Nothing to map.</p>
          <p className="mt-2 text-[13px] text-moss">
            All submitted ingredients resolve to a USDA record.
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {queue.map((row) => (
            <li key={row.rawText} className="py-4">
              <MapAllForm rawText={row.rawText} uses={row.uses} />
              <p className="mt-1 pl-0 font-mono text-[9px] uppercase tracking-[0.08em] text-moss">
                across {row.recipes} recipe{row.recipes === 1 ? "" : "s"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
