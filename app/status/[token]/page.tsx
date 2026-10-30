import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { recipes } from "@/lib/db/schema";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Submission status",
  robots: { index: false, follow: false },
};

const COPY: Record<
  string,
  { title: string; body: string; tone: "wait" | "good" | "bad" }
> = {
  pending: {
    title: "In the review queue",
    body: "A person reads every submission. We check the ingredients, the units and the photo before anything goes live. This usually takes a day or two.",
    tone: "wait",
  },
  approved: {
    title: "Published",
    body: "Your recipe is live. The card below is ready to share, and the credit uses the name and country you gave us.",
    tone: "good",
  },
  rejected: {
    title: "Not published",
    body: "We could not publish this one. The reviewer's note explains why — you are welcome to fix it and submit again.",
    tone: "bad",
  },
};

export default async function StatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { token } = await params;
  const { new: isNew } = await searchParams;

  const [recipe] = await db
    .select({
      title: recipes.title,
      slug: recipes.slug,
      status: recipes.status,
      reviewNote: recipes.reviewNote,
      submittedAt: recipes.submittedAt,
      publishedAt: recipes.publishedAt,
    })
    .from(recipes)
    .where(eq(recipes.submitterToken, token))
    .limit(1);

  if (!recipe) notFound();

  const copy = COPY[recipe.status] ?? COPY.pending;

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-xl">
        {isNew ? (
          <p className="eyebrow text-forest">Received — thank you</p>
        ) : (
          <p className="eyebrow">Submission status</p>
        )}

        <h1 className="display mt-3 text-[clamp(2.4rem,5vw,3.6rem)]">
          {copy.title}
        </h1>
        <p className="mt-4 text-[14px] leading-relaxed text-moss">{copy.body}</p>

        <div
          className={`mt-8 border-l-2 px-5 py-4 ${
            copy.tone === "good"
              ? "border-lime bg-lime-soft/30"
              : copy.tone === "bad"
                ? "border-rust bg-rust/5"
                : "border-line-strong bg-paper-deep/50"
          }`}
        >
          <p className="display text-xl">{recipe.title}</p>
          <p className="mt-1 text-[11px] text-moss">
            Submitted {formatDate(recipe.submittedAt)}
            {recipe.publishedAt
              ? ` · Published ${formatDate(recipe.publishedAt)}`
              : ""}
          </p>

          {recipe.reviewNote ? (
            <div className="mt-4 border-t border-line pt-3">
              <p className="eyebrow">Reviewer's note</p>
              <p className="mt-1.5 text-[13px] leading-relaxed">
                {recipe.reviewNote}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {recipe.status === "approved" ? (
            <>
              <Link
                href={`/recipes/${recipe.slug}`}
                className={buttonVariants({ size: "sm" })}
              >
                View the recipe
              </Link>
              <a
                href={`/recipes/${recipe.slug}/card.png`}
                className={buttonVariants({ variant: "secondary", size: "sm" })}
                download
              >
                Download the share card
              </a>
            </>
          ) : null}
          {recipe.status === "rejected" ? (
            <Link href="/submit" className={buttonVariants({ size: "sm" })}>
              Try again
            </Link>
          ) : null}
          <Link
            href="/recipes"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Browse recipes
          </Link>
        </div>

        <p className="mt-10 border-t border-line pt-5 text-[11px] leading-relaxed text-moss">
          Keep this link — it is the only way back to your submission. It is
          private, so do not post it publicly.
        </p>
      </div>
    </div>
  );
}
