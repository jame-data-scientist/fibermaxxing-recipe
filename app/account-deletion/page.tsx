import type { Metadata } from "next";
import Link from "next/link";

import { PLAY_STORE_URL } from "@/lib/site";

const DELETION_EMAIL =
  process.env.ACCOUNT_DELETION_EMAIL ?? "slothdevwork@gmail.com";

export const metadata: Metadata = {
  title: "Delete your account",
  description:
    "How to permanently delete your FiberMaxxing account, sign-in and associated data.",
};

export default function AccountDeletionPage() {
  return (
    <div className="container-page py-14">
      <article className="mx-auto max-w-2xl">
        <p className="eyebrow">Account</p>
        <h1 className="display mt-3 text-[clamp(2.4rem,4.8vw,3.4rem)]">
          Delete your account
        </h1>
        <p className="mt-4 text-[13px] leading-relaxed text-moss">
          You can delete your FiberMaxxing account and the data attached to it
          from inside the Android app. This page explains the steps, what is
          removed and how to ask us to do it if you can no longer sign in.
        </p>

        <section className="mt-10 border border-line p-5 sm:p-6">
          <h2 className="display text-2xl">Delete it in the app</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-[14px] leading-relaxed text-ink/90">
            <li>Open FiberMaxxing and sign in to the account you want to delete.</li>
            <li>Open the <strong>Profile</strong> tab.</li>
            <li>
              Scroll to the card containing Terms of Service, Privacy Policy and
              Medical Disclaimer, then tap <strong>Delete account</strong>.
            </li>
            <li>
              Confirm with <strong>Delete everything</strong>. The app signs you
              out and the account cannot be restored.
            </li>
          </ol>
          <p className="mt-4 text-[13px] leading-relaxed text-moss">
            The in-app option is the fastest route. It removes the account and
            its data immediately, without a waiting period.
          </p>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.1em] text-forest underline decoration-line-strong underline-offset-4"
          >
            Open FiberMaxxing on Google Play →
          </a>
        </section>

        <div className="mt-10 space-y-8 text-[14px] leading-relaxed text-ink/90">
          <section>
            <h2 className="display text-2xl">What is deleted</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Your sign-in account and email address.</li>
              <li>
                Your profile, body metrics, goals, dietary restrictions and
                allergies.
              </li>
              <li>
                Food, water and gut-symptom logs, plus daily totals and Fiber
                Coins.
              </li>
              <li>
                Meal plans, grocery lists, family-member profiles and AI usage
                counters.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="display text-2xl">What we may keep</h2>
            <p className="mt-2">
              We keep purchase and payment records where tax or accounting law
              requires them, and records needed to answer a legal claim or a
              copyright notice. Your account data is deleted immediately and
              completely; the only residue is whatever our providers keep in
              their own encrypted backups, which expire on their documented
              schedules rather than a period we set. Everything else is deleted
              or anonymised as described in our{" "}
              <Link href="/privacy" className="text-forest underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="display text-2xl">Cancel your subscription first</h2>
            <p className="mt-2">
              Deleting your FiberMaxxing account does <strong>not</strong> cancel
              a Google Play subscription. Cancel it in the Play Store under{" "}
              <strong>Payments &amp; subscriptions</strong> before deleting the
              account; otherwise Google may continue to bill you.
            </p>
          </section>

          <section>
            <h2 className="display text-2xl">If you cannot sign in</h2>
            <p className="mt-2">
              Email{" "}
              <a
                href={`mailto:${DELETION_EMAIL}?subject=Account%20deletion%20request`}
                className="text-forest underline"
              >
                {DELETION_EMAIL}
              </a>{" "}
              from the address you used to sign in, with the subject{" "}
              <strong>Account deletion request</strong>. Include the email
              address on the account and whether you signed in with Google or
              email/password. Do not send health details.
            </p>
            <p className="mt-2">
              We may ask you to verify that you control the account before
              deleting it. Requests are handled within 30 days.
            </p>
          </section>

          <section>
            <h2 className="display text-2xl">Other questions</h2>
            <p className="mt-2">
              For access, correction or export requests, see the rights section
              of the{" "}
              <Link href="/privacy" className="text-forest underline">
                Privacy Policy
              </Link>{" "}
              or email{" "}
              <a
                href={`mailto:${DELETION_EMAIL}`}
                className="text-forest underline"
              >
                {DELETION_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
