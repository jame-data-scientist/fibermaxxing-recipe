import Link from "next/link";

import { Wordmark } from "@/components/brand";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/recipes", label: "Recipes" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/92 backdrop-blur-sm">
      <div className="container-page flex h-16 items-center justify-between gap-3 sm:gap-6">
        <Wordmark />
        <nav className="flex items-center gap-0.5 sm:gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-2.5 py-2 text-[13px] font-medium text-moss transition-colors hover:bg-paper-deep hover:text-ink sm:px-3",
                link.href === "/about" && "hidden sm:inline-block",
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/submit"
            className={cn(buttonVariants({ size: "sm" }), "ml-1 hidden sm:inline-flex")}
          >
            Submit a recipe
          </Link>
          <Link
            href="/submit"
            className={cn(buttonVariants({ size: "sm" }), "ml-1 sm:hidden")}
          >
            Submit
          </Link>
        </nav>
      </div>
    </header>
  );
}
