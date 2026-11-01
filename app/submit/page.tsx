import type { Metadata } from "next";
import Link from "next/link";

import { SubmissionForm } from "@/components/submit/submission-form";

export const metadata: Metadata = {
  title: "Submit a recipe",
  description:
    "Send your high-fibre or high-protein recipe to FiberMaxxing Kitchen. We calculate the nutrition from USDA data and credit you by name and country.",
};

export default function SubmitPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="max-w-2xl">
          <p className="eyebrow">Add to the collection</p>
          <h1 className="display mt-3 text-[clamp(2.6rem,5.4vw,4rem)]">
            Your recipe,
            <br />
            <span className="italic text-forest">properly measured.</span>
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-moss">
            Five minutes, no account. We match every ingredient to USDA data so
            the fibre and protein numbers are real, then a person reads it before
            it goes live.
          </p>
        </div>

        <div className="border border-line bg-paper-deep/40 p-5 lg:mt-12">
          <p className="eyebrow">Before you start</p>
          <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-moss">
            <li>· Have your ingredient amounts to hand.</li>
            <li>· No pork and no alcohol — we don’t publish those recipes.</li>
            <li>· One photo of the finished dish is required.</li>
            <li>
              · It must be a photo you took yourself.{" "}
              <Link href="/content-policy" className="text-forest underline">
                Content policy
              </Link>
              .
            </li>
            <li>· Nothing publishes without a human review.</li>
          </ul>
        </div>
      </div>

      <div className="mt-10">
        <SubmissionForm
          turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
        />
      </div>
    </div>
  );
}
