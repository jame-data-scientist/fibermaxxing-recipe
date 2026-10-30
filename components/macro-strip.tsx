import { cn, formatNumber } from "@/lib/utils";

export function MacroStrip({
  fiber,
  protein,
  kcal,
  carbs,
  fat,
  className,
  size = "md",
}: {
  fiber: number;
  protein: number;
  kcal: number;
  carbs: number;
  fat: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const cells = [
    { label: "Fibre", value: fiber, unit: "g", accent: true },
    { label: "Protein", value: protein, unit: "g" },
    { label: "Calories", value: kcal, unit: "kcal" },
    { label: "Carbs", value: carbs, unit: "g" },
    { label: "Fat", value: fat, unit: "g" },
  ];

  return (
    <dl
      className={cn(
        // Two rows on phones (the two headline numbers, then the rest),
        // one row of five from 640 px up.
        "grid grid-cols-6 border-y border-line sm:grid-cols-5",
        className,
      )}
    >
      {cells.map((cell, index) => (
        <div
          key={cell.label}
          className={cn(
            "px-2 py-2.5 text-center sm:border-l sm:border-line sm:px-4 sm:py-3 sm:text-left sm:first:border-l-0",
            index < 2
              ? "col-span-3 max-sm:border-b max-sm:border-line sm:col-span-1"
              : "col-span-2 sm:col-span-1",
            (index === 0 || index === 2 || index === 3) &&
              "max-sm:border-r max-sm:border-line",
            cell.accent && "bg-lime-soft/40",
          )}
        >
          <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-moss sm:text-[10px]">
            {cell.label}
          </dt>
          <dd
            className={cn(
              "mt-1 font-mono tabular-nums tracking-tight",
              size === "sm" && "text-[15px]",
              size === "md" && "text-[19px]",
              size === "lg" && "text-[26px] sm:text-[26px]",
              index < 2 ? "max-sm:text-[24px]" : "max-sm:text-[18px]",
              cell.accent ? "text-forest" : "text-ink",
            )}
          >
            {formatNumber(cell.value)}
            <span className="ml-0.5 text-[10px] font-normal text-moss">
              {cell.unit}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
