import type { Metadata } from "next";
import Link from "next/link";

import { PLAY_STORE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why FiberMaxxing Kitchen publishes recipes with calculated fibre and protein, and how the numbers are made.",
};

export default function AboutPage() {
  return (
    <div className="container-page py-14">
      <article className="mx-auto max-w-2xl">
        <p className="eyebrow">About</p>
        <h1 className="display mt-3 text-[clamp(2.6rem,5.2vw,3.8rem)]">
          Real food, real arithmetic.
        </h1>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-ink/90">
          <p>
            Most recipe sites tell you a dish is “high fibre” because someone
            typed it into a field. We wanted the opposite: a collection where the
            number on the card is the number in the bowl, and where the person
            who cooked it gets the credit.
          </p>
          <p>
            Every recipe is submitted by a cook, reviewed by a human, and costed
            against USDA FoodData Central. Ingredients are matched to a specific
            USDA record, converted to grams through published portion weights,
            summed, and divided by the number of servings. A cup of oats is 156
            grams because USDA measured it, not because we assumed a density.
          </p>
          <p>
            That means the badges mean something. High fibre is 8 g or more per
            serving. High protein is 25 g or more. If a recipe does not clear the
            bar, it does not get the badge — and because the numbers are
            recomputed whenever an ingredient changes, that stays true.
          </p>
        </div>

        <section className="mt-12 border-t border-line pt-8">
          <h2 className="display text-2xl">The rules of the kitchen</h2>
          <ol className="mt-4 space-y-3 text-[14px] leading-relaxed">
            <li>
              <span className="font-mono text-[11px] text-forest">01</span>{" "}
              Photos must be taken by the cook. If you did not photograph it, we
              will design a card instead.
            </li>
            <li>
              <span className="font-mono text-[11px] text-forest">02</span>{" "}
              Nothing publishes without a person reading it.
            </li>
            <li>
              <span className="font-mono text-[11px] text-forest">03</span>{" "}
              Nutrition is an estimate, labelled as one. It is not medical advice.
            </li>
            <li>
              <span className="font-mono text-[11px] text-forest">04</span>{" "}
              Copyright is enforced, with a proper{" "}
              <Link href="/dmca" className="text-forest underline">
                takedown process
              </Link>{" "}
              and a repeat-infringer policy.
            </li>
          </ol>
        </section>

        <section className="mt-12 border-t border-line pt-8">
          <h2 className="display text-2xl">The app</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-moss">
            FiberMaxxing is a fibre-first nutrition tracker for Android. It
            tracks fibre against a personal target, keeps a food diary, and backs
            it up. The recipes here are the public kitchen attached to it — this
            site stands on its own, and the app is where the numbers become a
            daily habit.
          </p>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.1em] text-forest underline decoration-line-strong underline-offset-4"
          >
            Open Google Play →
          </a>
        </section>

        <section className="mt-12 border-t border-line pt-8 text-[13px] leading-relaxed text-moss">
          <h2 className="display text-2xl text-ink">Contact</h2>
          <p className="mt-3">
            Copyright: see the{" "}
            <Link href="/dmca" className="text-forest underline">
              copyright page
            </Link>
            . Everything else: use the report link on any recipe, or the contact
            on the copyright page.
          </p>
        </section>
      </article>
    </div>
  );
}
