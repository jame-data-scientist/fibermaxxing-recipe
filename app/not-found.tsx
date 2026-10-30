import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page py-24">
      <div className="mx-auto max-w-md text-center">
        <p className="eyebrow">404</p>
        <h1 className="display mt-3 text-5xl">This plate is empty.</h1>
        <p className="mt-4 text-[14px] leading-relaxed text-moss">
          The page you were looking for is not here. The recipes are.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/recipes" className={buttonVariants({ size: "sm" })}>
            Browse recipes
          </Link>
          <Link
            href="/"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
