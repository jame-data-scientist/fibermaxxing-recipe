import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Content policy",
  description:
    "What can and cannot be submitted to FiberMaxxing Kitchen, and how moderation works.",
};

export default function ContentPolicyPage() {
  return (
    <div className="container-page py-14">
      <article className="mx-auto max-w-2xl">
        <p className="eyebrow">Submission rules</p>
        <h1 className="display mt-3 text-[clamp(2.4rem,4.8vw,3.4rem)]">
          Content policy
        </h1>
        <p className="mt-4 text-[14px] leading-relaxed text-moss">
          These rules exist so the collection stays useful and so nobody's work
          gets stolen. Breaking them gets a submission rejected; breaking them
          repeatedly gets submission privileges removed.
        </p>

        <div className="mt-10 space-y-8 text-[14px] leading-relaxed text-ink/90">
          <section>
            <h2 className="display text-2xl">Welcome</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Recipes you cooked, or adapted with permission.</li>
              <li>Photos you took yourself, even if the lighting is bad.</li>
              <li>Honest ingredient amounts and real steps.</li>
              <li>Recipes from any cuisine, country or skill level.</li>
            </ul>
          </section>

          <section>
            <h2 className="display text-2xl">Not allowed</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                <strong>Text or photos you do not own.</strong> No copying
                another site's recipe, no screenshots, no images saved from
                Pinterest or Google Images.
              </li>
              <li>
                <strong>AI-generated food images.</strong> They misrepresent the
                dish and the promise that a person cooked it.
              </li>
              <li>
                <strong>Other people's faces</strong> without their consent.
              </li>
              <li>
                <strong>Branded packaging as the main subject.</strong> The
                recipe is the point, not the label.
              </li>
              <li>
                <strong>Watermarks</strong> you did not create, or visible
                attribution to another creator.
              </li>
              <li>
                <strong>Medical claims.</strong> “Cures IBS”, “reverses
                diabetes”, “detoxes” — no.
              </li>
              <li>
                <strong>Unsafe dieting advice,</strong> extreme restriction, or
                anything that encourages disordered eating.
              </li>
              <li>
                <strong>Advertising, affiliate links or spam.</strong>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="display text-2xl">How moderation works</h2>
            <p className="mt-2">
              Every submission enters a queue. A reviewer checks the photo
              attesting that the cook took it, maps any ingredient that did not
              resolve automatically, verifies the nutrition can be computed, and
              reads the method. Nothing is published automatically.
            </p>
            <p className="mt-2">
              We may fix spelling, tighten a step, or adjust units. We will not
              change what the recipe is. If the nutrition cannot be computed, the
              submission stays unpublished until the ingredient or unit is fixed.
            </p>
          </section>

          <section>
            <h2 className="display text-2xl">Copyright and strikes</h2>
            <p className="mt-2">
              Every submission records an attestation that the recipe and photo
              are the contributor's. A valid copyright notice removes the content
              immediately and records a strike. Two valid strikes end submission
              privileges. The process, including counter-notice, is on the{" "}
              <Link href="/dmca" className="text-forest underline">
                copyright page
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="display text-2xl">Allergens and health</h2>
            <p className="mt-2">
              Allergen checkboxes are filled in by the cook and are shown as
              cook-reported. They are not verified. Nutrition values are
              estimates from USDA data, not laboratory analysis, and are not
              medical advice. If you are increasing fibre, do it gradually and
              drink enough water.
            </p>
          </section>

          <section>
            <h2 className="display text-2xl">Reporting something</h2>
            <p className="mt-2">
              Every recipe has a report link. For copyright, use the{" "}
              <Link href="/dmca" className="text-forest underline">
                DMCA process
              </Link>{" "}
              — it is faster and it has legal weight.
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
