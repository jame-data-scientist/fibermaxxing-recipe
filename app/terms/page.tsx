import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "The terms that apply to reading and using FiberMaxxing Kitchen.",
};

export default function TermsPage() {
  return (
    <div className="container-page py-14">
      <article className="mx-auto max-w-2xl">
        <p className="eyebrow">Terms</p>
        <h1 className="display mt-3 text-[clamp(2.4rem,4.8vw,3.4rem)]">
          Terms of use
        </h1>
        <p className="mt-4 text-[13px] leading-relaxed text-moss">
          These cover using the site. If you submit a recipe, the{" "}
          <Link href="/submit/terms" className="text-forest underline">
            contributor terms
          </Link>{" "}
          also apply.
        </p>

        <div className="mt-10 space-y-8 text-[14px] leading-relaxed text-ink/90">
          <section>
            <h2 className="display text-2xl">1. What this site is</h2>
            <p className="mt-2">
              A collection of recipes submitted by cooks, with nutrition
              estimates calculated from USDA FoodData Central. It is information,
              not medical or dietary advice, and not a substitute for a clinician
              or a dietitian.
            </p>
          </section>

          <section>
            <h2 className="display text-2xl">2. Nutrition estimates</h2>
            <p className="mt-2">
              Values are computed from published food composition data and
              household portion weights. They are estimates. Cooking losses,
              brand variation, substitutions and portioning will change the real
              number. Allergen information is provided by the cook and is not
              verified. Always read labels if you have an allergy.
            </p>
          </section>

          <section>
            <h2 className="display text-2xl">3. Other people's recipes</h2>
            <p className="mt-2">
              Recipes remain the property of the cooks who submitted them. You may
              cook them, print them and share links. You may not republish the
              collection, or substantial parts of it, without permission. Photos
              may not be reused.
            </p>
          </section>

          <section>
            <h2 className="display text-2xl">4. Acceptable use</h2>
            <p className="mt-2">
              Do not scrape the site at a rate that degrades it, attempt to access
              the admin area, submit content you do not own, or use the site to
              harass anyone. The{" "}
              <Link href="/content-policy" className="text-forest underline">
                content policy
              </Link>{" "}
              sets out what cannot be submitted.
            </p>
          </section>

          <section>
            <h2 className="display text-2xl">5. Copyright complaints</h2>
            <p className="mt-2">
              We respond to valid notices under the DMCA and equivalent regimes.
              The process, the designated agent and the counter-notice route are
              on the{" "}
              <Link href="/dmca" className="text-forest underline">
                copyright page
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="display text-2xl">6. Availability and liability</h2>
            <p className="mt-2">
              The site is provided as-is. We do not promise it will be available
              without interruption, and we are not liable for loss arising from
              reliance on a recipe or a nutrition estimate, to the extent the law
              allows. Nothing here limits liability that cannot be limited.
            </p>
          </section>

          <section>
            <h2 className="display text-2xl">7. Changes</h2>
            <p className="mt-2">
              We may update these terms. The contributor terms record a version
              against each submission, so the terms a cook agreed to are always
              recoverable.
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
