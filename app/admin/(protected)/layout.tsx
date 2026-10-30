import Link from "next/link";

import { SignOutButton } from "@/components/admin/sign-out";
import { requireAdmin } from "@/lib/admin";

const links = [
  { href: "/admin", label: "Queue" },
  { href: "/admin/foods", label: "Food mapping" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/dmca", label: "DMCA" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="eyebrow">Kitchen admin</p>
          <p className="mt-1 text-[13px] text-moss">
            Moderator mode · no accounts, one shared key
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-[12px] text-moss hover:text-forest">
            View site
          </Link>
          <SignOutButton />
        </div>
      </div>

      <nav className="mt-4 flex flex-wrap gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-moss hover:bg-paper-deep hover:text-ink"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8">{children}</div>
    </div>
  );
}
