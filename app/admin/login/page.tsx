import type { Metadata } from "next";
import Link from "next/link";

import { signInWithKey } from "@/app/actions/admin-auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

export const metadata: Metadata = {
  title: "Moderator access",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-sm">
        <p className="eyebrow">Kitchen staff</p>
        <h1 className="display mt-3 text-4xl">Moderator key</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-moss">
          Readers never sign in and cooks never make an account. Reviewing
          submissions needs the shared key from <code>ADMIN_KEY</code>.
        </p>

        <form action={signInWithKey} className="mt-8 space-y-4">
          <div>
            <Label htmlFor="key">Key</Label>
            <Input
              id="key"
              name="key"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1.5"
            />
          </div>

          {error ? (
            <p className="border-l-2 border-rust bg-rust/5 px-3 py-2 text-[12px] text-rust">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full">
            Unlock the queue
          </Button>
        </form>

        <p className="mt-8 text-[12px] text-moss">
          <Link href="/" className="underline decoration-line-strong">
            Back to the kitchen
          </Link>
        </p>
      </div>
    </div>
  );
}
