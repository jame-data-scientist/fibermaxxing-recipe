import Link from "next/link";

import { PixelLeaf } from "@/components/brand";

const columns = [
  {
    heading: "Browse",
    links: [
      { href: "/recipes", label: "All recipes" },
      { href: "/recipes?tag=high_fiber", label: "High fibre" },
      { href: "/recipes?tag=high_protein", label: "High protein" },
      { href: "/recipes?tag=both", label: "Both" },
    ],
  },
  {
    heading: "Kitchen",
    links: [
      { href: "/submit", label: "Submit a recipe" },
      { href: "/submit/terms", label: "Contributor terms" },
      { href: "/about", label: "About" },
      { href: "/content-policy", label: "Content policy" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/dmca", label: "Copyright & DMCA" },
      { href: "/terms", label: "Terms of use" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-paper-deep/60">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-2">
              <PixelLeaf className="h-6 w-6" />
              <span className="text-sm font-semibold">FiberMaxxing Kitchen</span>
            </div>
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-moss">
              Recipes from real cooks, with fibre and protein calculated from
              USDA FoodData Central — not guessed.
            </p>
            <p className="mt-6 text-[11px] leading-relaxed text-moss/80">
              Nutrition values are estimates, not lab tests, and are not medical
              advice. Allergen information is provided by the cook — always check
              labels.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.heading}>
              <p className="eyebrow">{column.heading}</p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-ink/80 hover:text-forest"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 text-[11px] text-moss sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} FiberMaxxing. Recipes remain the
            property of their cooks.
          </p>
          <p>
            Data:{" "}
            <a
              href="https://fdc.nal.usda.gov/"
              className="underline decoration-line-strong underline-offset-2 hover:text-forest"
              target="_blank"
              rel="noreferrer"
            >
              USDA FoodData Central
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
