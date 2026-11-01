import type { Metadata } from "next";

import { submitDmca } from "@/app/actions/trust";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";

export const metadata: Metadata = {
  title: "Copyright & DMCA",
  description:
    "How to send a copyright takedown notice for a recipe or photo published on FiberMaxxing Kitchen, and how to file a counter-notice.",
};

const AGENT_EMAIL =
  process.env.DMCA_AGENT_EMAIL ?? "slothdevwork@gmail.com";

export default async function DmcaPage({
  searchParams,
}: {
  searchParams: Promise<{ received?: string; error?: string }>;
}) {
  const query = await searchParams;

  return (
    <div className="container-page py-14">
      <article className="mx-auto max-w-2xl">
        <p className="eyebrow">Copyright</p>
        <h1 className="display mt-3 text-[clamp(2.4rem,4.8vw,3.4rem)]">
          Copyright & DMCA
        </h1>
        <p className="mt-4 text-[14px] leading-relaxed text-moss">
          Recipes and photographs on this site are submitted by people who cook.
          We take copyright seriously, including when a submitter gets it wrong.
        </p>

        {query.received ? (
          <div className="mt-6 border-l-2 border-lime bg-lime-soft/30 px-4 py-3 text-[13px] text-forest">
            Notice received. If it resolves to a recipe on this site, that recipe
            has already been removed from public view while we review it.
          </div>
        ) : null}
        {query.error ? (
          <div className="mt-6 border-l-2 border-rust bg-rust/5 px-4 py-3 text-[13px] text-rust">
            {query.error}
          </div>
        ) : null}

        <div className="mt-10 space-y-8 text-[14px] leading-relaxed text-ink/90">
          <section>
            <h2 className="display text-2xl">Our policy</h2>
            <p className="mt-2">
              Every recipe is checked by a person before publication. Photos must
              be taken by the cook, and the submission form requires them to
              attest to that. When we receive a valid notice, the content is
              removed immediately — within 48 hours at the outside — and the
              submitter records a strike.
            </p>
          </section>

          <section>
            <h2 className="display text-2xl">Repeat infringers</h2>
            <p className="mt-2">
              Two valid copyright strikes end submission privileges for that
              person, permanently. The strikes are recorded against a hashed IP
              and the credited handle.
            </p>
          </section>

          <section>
            <h2 className="display text-2xl">Send a takedown notice</h2>
            <p className="mt-2">
              If you own a recipe or photograph published here and did not give
              permission, send the notice below. It must include all of the
              statutory elements. You can also email{" "}
              <a href={`mailto:${AGENT_EMAIL}`} className="text-forest underline">
                {AGENT_EMAIL}
              </a>
              .
            </p>

            <form action={submitDmca} className="mt-5 space-y-4 border border-line p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="claimantName">Your name</Label>
                  <Input
                    id="claimantName"
                    name="claimantName"
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="claimantEmail">Your email</Label>
                  <Input
                    id="claimantEmail"
                    name="claimantEmail"
                    type="email"
                    required
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="workDescription">
                  The work you own
                </Label>
                <Textarea
                  id="workDescription"
                  name="workDescription"
                  rows={3}
                  required
                  placeholder="Describe the copyrighted work — the recipe text, the photograph, where it was first published."
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="infringingUrl">The URL on this site</Label>
                <Input
                  id="infringingUrl"
                  name="infringingUrl"
                  required
                  placeholder="https://…/recipes/…"
                  className="mt-1.5"
                />
              </div>

              <label className="flex items-start gap-3 text-[12px] leading-relaxed">
                <input
                  type="checkbox"
                  name="goodFaith"
                  required
                  className="mt-0.5 h-4 w-4 accent-[#0F3D22]"
                />
                I have a good-faith belief that the use described above is not
                authorised by the copyright owner, its agent, or the law.
              </label>

              <label className="flex items-start gap-3 text-[12px] leading-relaxed">
                <input
                  type="checkbox"
                  name="accuracy"
                  required
                  className="mt-0.5 h-4 w-4 accent-[#0F3D22]"
                />
                I declare, under penalty of perjury, that this notice is accurate
                and that I am the copyright owner or authorised to act on their
                behalf. I understand that a material misrepresentation may expose
                me to liability.
              </label>

              <div>
                <Label htmlFor="signature">Electronic signature</Label>
                <Input
                  id="signature"
                  name="signature"
                  required
                  placeholder="Type your full name"
                  className="mt-1.5"
                />
              </div>

              <Button type="submit" size="sm">
                Submit notice
              </Button>
            </form>
          </section>

          <section>
            <h2 className="display text-2xl">Counter-notice</h2>
            <p className="mt-2">
              If your recipe was removed and you believe that was a mistake or a
              misidentification, email{" "}
              <a href={`mailto:${AGENT_EMAIL}`} className="text-forest underline">
                {AGENT_EMAIL}
              </a>{" "}
              with your name, address, phone number, the removed URL, a statement
              under penalty of perjury that you have a good-faith belief the
              material was removed by mistake, and your consent to the
              jurisdiction of the federal court for your district. We will
              forward the counter-notice to the claimant and may restore the
              content after 10–14 business days unless they tell us they have
              filed an action.
            </p>
          </section>

          <section>
            <h2 className="display text-2xl">Designated agent</h2>
            <p className="mt-2">
              Copyright notices may also be sent to our designated agent at{" "}
              <a href={`mailto:${AGENT_EMAIL}`} className="text-forest underline">
                {AGENT_EMAIL}
              </a>
              . Our agent registration with the U.S. Copyright Office is
              maintained under 17 U.S.C. § 512(c).
            </p>
          </section>

          <section>
            <h2 className="display text-2xl">Removing your own recipe</h2>
            <p className="mt-2">
              If you submitted the recipe, you do not need a formal notice — use
              the same address and we will remove it. Copies already shared or
              cached by search engines and social platforms may persist.
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
