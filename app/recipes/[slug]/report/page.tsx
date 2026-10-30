import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { submitReport } from "@/app/actions/trust";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea } from "@/components/ui/field";
import { db } from "@/lib/db";
import { recipes } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Report a recipe",
  robots: { index: false, follow: false },
};

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  const [recipe] = await db
    .select({ title: recipes.title })
    .from(recipes)
    .where(and(eq(recipes.slug, slug), eq(recipes.status, "approved")))
    .limit(1);

  if (!recipe) notFound();

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-lg">
        <Link
          href={`/recipes/${slug}`}
          className="font-mono text-[10px] uppercase tracking-[0.1em] text-moss hover:text-forest"
        >
          ← Back to the recipe
        </Link>

        <h1 className="display mt-3 text-4xl">Report this recipe</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-moss">
          {recipe.title}
        </p>

        {query.sent ? (
          <div className="mt-8 border-l-2 border-lime bg-lime-soft/30 px-4 py-3 text-[13px] text-forest">
            Thank you — a person will look at this.
          </div>
        ) : null}
        {query.error ? (
          <div className="mt-8 border-l-2 border-rust bg-rust/5 px-4 py-3 text-[13px] text-rust">
            {query.error}
          </div>
        ) : null}

        {query.sent ? null : (
          <form action={submitReport} className="mt-8 space-y-5">
            <input type="hidden" name="slug" value={slug} />
            <div>
              <Label htmlFor="kind">What is wrong?</Label>
              <Select id="kind" name="kind" defaultValue="copyright" className="mt-1.5">
                <option value="copyright">Copyright — this is not the cook's work</option>
                <option value="harmful">Unsafe or harmful content</option>
                <option value="spam">Spam or advertising</option>
                <option value="other">Something else</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="note" hint="Optional">
                Details
              </Label>
              <Textarea
                id="note"
                name="note"
                rows={4}
                maxLength={800}
                placeholder="Tell us where the original work is, or what is wrong."
                className="mt-1.5"
              />
            </div>
            <Button type="submit" size="sm">
              Send report
            </Button>
            <p className="text-[11px] leading-relaxed text-moss">
              For a formal copyright takedown, use the{" "}
              <Link href="/dmca" className="text-forest underline">
                DMCA process
              </Link>{" "}
              instead — it has the legal weight and gets the recipe removed
              immediately.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
