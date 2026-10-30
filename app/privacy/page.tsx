import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What FiberMaxxing Kitchen collects when you submit a recipe, why, and how to have it removed.",
};

export default function PrivacyPage() {
  return (
    <div className="container-page py-14">
      <article className="mx-auto max-w-2xl">
        <p className="eyebrow">Privacy</p>
        <h1 className="display mt-3 text-[clamp(2.4rem,4.8vw,3.4rem)]">
          What we keep
        </h1>
        <p className="mt-4 text-[13px] leading-relaxed text-moss">
          Plain version: we keep what is needed to publish a recipe and stop
          abuse. We do not sell it, and we do not build a profile of you.
        </p>

        <div className="mt-10 space-y-8 text-[14px] leading-relaxed text-ink/90">
          <section>
            <h2 className="display text-2xl">When you submit a recipe</h2>
            <p className="mt-2">We collect:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>The name and country you want to be credited with.</li>
              <li>An optional Instagram handle.</li>
              <li>The recipe text, ingredients and steps.</li>
              <li>A photo if you choose to upload one.</li>
              <li>
                A one-way hash of your IP address, used only for rate limiting and
                the repeat-infringer record. We cannot recover the address from
                it.
              </li>
              <li>Submission and review timestamps.</li>
            </ul>
            <p className="mt-3">
              We do <strong>not</strong> ask for your email to submit a recipe.
              The status of your submission is reachable through a private link
              that only you have.
            </p>
          </section>

          <section>
            <h2 className="display text-2xl">Photos</h2>
            <p className="mt-2">
              Uploads are resized and re-encoded, which removes EXIF metadata
              including GPS coordinates. A SHA-256 fingerprint of the original
              file is stored as evidence of provenance for copyright disputes; it
              is not published.
            </p>
          </section>

          <section>
            <h2 className="display text-2xl">Copyright notices and reports</h2>
            <p className="mt-2">
              If you send a DMCA notice, we keep your name, email, the notice
              text and the signature, because the law requires a record of it. If
              you report a recipe, we keep the reason and note. Reports are
              reviewed by a person.
            </p>
          </section>

          <section>
            <h2 className="display text-2xl">Cookies and analytics</h2>
            <p className="mt-2">
              There are no accounts and no advertising cookies. Moderators
              unlock the review queue with a first-party cookie that contains
              only a signature, never your data. Spam protection (Cloudflare Turnstile)
              may set its own technical cookies when the challenge runs. We do not
              run third-party analytics that profile readers.
            </p>
          </section>

          <section>
            <h2 className="display text-2xl">Who processes it</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Vercel — hosting and content delivery.</li>
              <li>Cloudflare D1 — the recipe database.</li>
              <li>Cloudflare R2 — the dish photos.</li>
              <li>Cloudflare Turnstile — spam protection, when enabled.</li>
              <li>USDA FoodData Central — the nutrition reference data.</li>
            </ul>
          </section>

          <section>
            <h2 className="display text-2xl">How long</h2>
            <p className="mt-2">
              Published recipes stay until you ask us to remove them. Rejected
              submissions are kept for review history and abuse prevention.
              Rate-limit records roll out of use within 24 hours, though the hash
              may be retained where a copyright strike was recorded.
            </p>
          </section>

          <section>
            <h2 className="display text-2xl">Your choices</h2>
            <p className="mt-2">
              You can ask for your recipe to be removed, for a correction to the
              credit, or for a copy of what we hold. Use the contact on the{" "}
              <Link href="/dmca" className="text-forest underline">
                copyright page
              </Link>
              . If you are in the UK/EU, that page is also how to exercise your
              data-protection rights.
            </p>
          </section>

          <section>
            <h2 className="display text-2xl">Children</h2>
            <p className="mt-2">
              The site is not directed at children under 13, and we do not
              knowingly accept submissions from them.
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
