import Image from "next/image";

import { PixelLeaf } from "@/components/brand";
import type { RecipeListItem } from "@/lib/queries/recipes";
import { cn, formatNumber, hashIndex } from "@/lib/utils";

const PALETTES = [
  { bg: "#E8F1E3", ink: "#173A24", rule: "#C3D6BF" },
  { bg: "#F4E9D8", ink: "#3C2A16", rule: "#DDC9A9" },
  { bg: "#E5EDF0", ink: "#1B3440", rule: "#BED2D9" },
  { bg: "#F1E6E1", ink: "#40251C", rule: "#DCC3B9" },
  { bg: "#EDEBDD", ink: "#2F3220", rule: "#D3D0BA" },
  { bg: "#E9E7F0", ink: "#2A2540", rule: "#C9C5DA" },
];

/**
 * A recipe without a photo still needs to look intentional. The typographic
 * cover is also the honest answer to "just grab a stock image".
 */
export function RecipeCover({
  recipe,
  className,
  sizes = "(min-width: 1024px) 380px, (min-width: 640px) 45vw, 100vw",
  priority = false,
  compact = false,
}: {
  recipe: RecipeListItem;
  className?: string;
  sizes?: string;
  priority?: boolean;
  compact?: boolean;
}) {
  if (recipe.imageUrl) {
    return (
      <div className={cn("relative overflow-hidden bg-paper-deep", className)}>
        <Image
          src={recipe.imageUrl}
          alt={recipe.imageAlt ?? recipe.title}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </div>
    );
  }

  const palette = PALETTES[hashIndex(recipe.slug, PALETTES.length)];

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between overflow-hidden p-5 sm:p-6",
        className,
      )}
      style={{ background: palette.bg, color: palette.ink }}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className="font-mono text-[10px] font-medium uppercase tracking-[0.16em]"
          style={{ color: palette.ink, opacity: 0.65 }}
        >
          {recipe.authorCountryName}
        </span>
        <PixelLeaf className="h-5 w-5 opacity-80" />
      </div>

      <div>
        <div
          className="mb-4 h-px w-10"
          style={{ background: palette.rule }}
          aria-hidden="true"
        />
        <h3
          className={cn(
            "display text-balance",
            compact ? "text-2xl" : "text-[clamp(1.6rem,3.4vw,2.6rem)]",
          )}
        >
          {recipe.title}
        </h3>
      </div>

      <div
        className="mt-6 flex items-end gap-5 border-t pt-3 font-mono text-[11px] uppercase tracking-[0.08em]"
        style={{ borderColor: palette.rule }}
      >
        <span>
          <span className="block text-[17px] leading-none tracking-tight">
            {formatNumber(recipe.fiberG)}
          </span>
          g fibre
        </span>
        <span>
          <span className="block text-[17px] leading-none tracking-tight">
            {formatNumber(recipe.proteinG)}
          </span>
          g protein
        </span>
      </div>
    </div>
  );
}
