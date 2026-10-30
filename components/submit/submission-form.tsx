"use client";

import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import Script from "next/script";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { FoodPicker } from "@/components/food-picker";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/field";
import { submitRecipe, type SubmitState } from "@/app/actions/submit";
import { countries } from "@/lib/countries";
import type { FoodOption } from "@/lib/foods";
import { computeNutrition } from "@/lib/nutrition/compute";
import {
  availableUnits,
  isUnitId,
  resolveGrams,
} from "@/lib/nutrition/units";
import { ALLERGENS, DIET_TAGS, TAG_LABELS } from "@/lib/site";
import { cn, formatNumber } from "@/lib/utils";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          callback: (token: string) => void;
          "expired-callback"?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const DRAFT_KEY = "fibermaxxing.submit.v1";
const STEPS = ["Photo", "The recipe", "Ingredients", "Finish"];

let rowCounter = 0;
function newRow(): DraftRow {
  rowCounter += 1;
  return {
    key: `row-${Date.now()}-${rowCounter}`,
    amount: "",
    unit: "g",
    food: null,
    note: "",
  };
}

interface DraftRow {
  key: string;
  amount: string;
  unit: string;
  food: FoodOption | null;
  note: string;
}

interface Draft {
  title: string;
  summary: string;
  authorName: string;
  countryCode: string;
  handle: string;
  servings: string;
  servingNote: string;
  servingGrams: string;
  prepMinutes: string;
  cookMinutes: string;
  tips: string;
  dietTags: string[];
  allergens: string[];
  imageUrl: string;
  imageSha256: string;
  imageAttested: boolean;
  rows: DraftRow[];
  steps: string[];
  consentTerms: boolean;
  consentLicense: boolean;
}

function initialDraft(): Draft {
  return {
    title: "",
    summary: "",
    authorName: "",
    countryCode: "",
    handle: "",
    servings: "2",
    servingNote: "",
    servingGrams: "",
    prepMinutes: "",
    cookMinutes: "",
    tips: "",
    dietTags: [],
    allergens: [],
    imageUrl: "",
    imageSha256: "",
    imageAttested: false,
    rows: [newRow(), newRow(), newRow()],
    steps: ["", ""],
    consentTerms: false,
    consentLicense: false,
  };
}

function numberOrNull(value: string): number | null {
  const number = Number(value);
  return value.trim() !== "" && Number.isFinite(number) ? number : null;
}

export function SubmissionForm({
  turnstileSiteKey,
}: {
  turnstileSiteKey: string;
}) {
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const [restored, setRestored] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const hydrated = useRef(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const countryList = useMemo(() => countries(), []);
  const [state, formAction, pending] = useActionState<SubmitState, FormData>(
    submitRecipe,
    { ok: false },
  );

  /* Restore before the first autosave so an empty draft never overwrites one. */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Draft;
        if (parsed?.title || parsed?.rows?.some((row) => row.food)) {
          setDraft({ ...initialDraft(), ...parsed });
          setRestored(true);
        }
      }
    } catch {
      /* corrupt draft: start clean */
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        /* storage full or blocked: submissions still work */
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [draft]);

  /* Turnstile renders when its script is ready, not when React mounts. */
  useEffect(() => {
    if (!turnstileSiteKey) return;
    const interval = setInterval(() => {
      if (
        window.turnstile &&
        widgetRef.current &&
        !widgetId.current
      ) {
        widgetId.current = window.turnstile.render(widgetRef.current, {
          sitekey: turnstileSiteKey,
          theme: "light",
          callback: (token) => setTurnstileToken(token),
          "expired-callback": () => setTurnstileToken(""),
        });
        clearInterval(interval);
      }
    }, 400);
    return () => clearInterval(interval);
  }, [turnstileSiteKey]);

  /* A Turnstile token is single use; a failed submit needs a fresh one. */
  useEffect(() => {
    if (!state.message) return;
    setTurnstileToken("");
    if (widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
    }
  }, [state]);

  const update = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    /* A stale "add a photo" error must not survive the photo being added. */
    if ("imageUrl" in patch || "imageAttested" in patch) {
      setErrors((current) => {
        if (!current.image) return current;
        const next = { ...current };
        delete next.image;
        return next;
      });
    }
  };

  const updateRow = (key: string, patch: Partial<DraftRow>) =>
    setDraft((current) => ({
      ...current,
      rows: current.rows.map((row) =>
        row.key === key ? { ...row, ...patch } : row,
      ),
    }));

  const servings = Math.max(1, Number(draft.servings) || 1);

  const resolvedRows = draft.rows.map((row) => {
    const amount = Number(row.amount);
    const unit = isUnitId(row.unit) ? row.unit : "g";
    const grams =
      row.food && amount > 0
        ? resolveGrams(amount, unit, row.food.portions)
        : null;
    return { row, grams, unit };
  });

  const nutrition = computeNutrition(
    resolvedRows.map((row) => ({
      grams: row.grams,
      food: row.row.food,
      mappingStatus: "mapped" as const,
    })),
    servings,
  );

  const filledRows = draft.rows.filter((row) => row.food);
  const unconverted = resolvedRows.filter(
    (row) => row.row.food && row.grams == null,
  ).length;

  function validateStep(index: number): boolean {
    const next: Record<string, string> = {};

    if (index === 0) {
      if (!draft.imageUrl) {
        next.image = "Add a photo of the finished dish to continue.";
      } else if (!draft.imageAttested) {
        next.image = "Please confirm you took this photo yourself.";
      }
    }

    if (index === 1) {
      if (draft.title.trim().length < 3) next.title = "Give your recipe a title.";
      if (draft.authorName.trim().length < 2) next.authorName = "Who cooked it?";
      if (!draft.countryCode) next.country = "Pick your country.";
      if (servings < 1) next.servings = "At least one serving.";
    }

    if (index === 2) {
      if (filledRows.length < 2) {
        next.ingredients = "Add at least two ingredients.";
      }
      const missingAmount = draft.rows.some(
        (row) => row.food && !(Number(row.amount) > 0),
      );
      if (missingAmount) {
        next.ingredients = "Give every ingredient an amount.";
      }
      if (unconverted > 0) {
        next.ingredients =
          "A unit has no cup or piece weight for that food — switch it to grams.";
      }
    }

    if (index === 3) {
      if (draft.steps.filter((text) => text.trim().length >= 3).length < 2) {
        next.steps = "Write at least two steps.";
      }
      if (!draft.consentTerms || !draft.consentLicense) {
        next.consent = "Both boxes are required to publish a recipe.";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function next() {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function back() {
    setErrors({});
    setStep((current) => Math.max(0, current - 1));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const data = (await response.json()) as {
        url?: string;
        sha256?: string;
        error?: string;
      };
      if (!response.ok || !data.url) {
        setUploadError(data.error ?? "Upload failed. Try a smaller photo.");
        return;
      }
      update({
        imageUrl: data.url,
        imageSha256: data.sha256 ?? "",
        imageAttested: false,
      });
    } catch {
      setUploadError("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  const payload = {
    title: draft.title.trim(),
    summary: draft.summary.trim(),
    authorName: draft.authorName.trim(),
    authorCountryCode: draft.countryCode,
    authorHandle: draft.handle.trim(),
    servings,
    servingNote: draft.servingNote.trim(),
    servingGrams: numberOrNull(draft.servingGrams),
    prepMinutes: numberOrNull(draft.prepMinutes),
    cookMinutes: numberOrNull(draft.cookMinutes),
    tips: draft.tips.trim(),
    dietTags: draft.dietTags,
    allergens: draft.allergens,
    imageUrl: draft.imageUrl,
    imageSha256: draft.imageSha256,
    imageAttested: draft.imageAttested,
    ingredients: draft.rows
      .filter((row) => row.food)
      .map((row) => ({
        amount: Number(row.amount),
        unit: row.unit,
        foodFdcId: row.food!.fdcId,
        note: row.note.trim(),
      })),
    steps: draft.steps.map((text) => text.trim()).filter(Boolean),
    termsAccepted: draft.consentTerms,
    licenseAccepted: draft.consentLicense,
  };

  const stepActions = (variant: "inline" | "bar") => {
    const primarySize: "sm" | "lg" = variant === "inline" ? "lg" : "sm";
    const backSize: "sm" | "md" = variant === "inline" ? "md" : "sm";

    return (
      <>
        <Button
          type="button"
          variant="secondary"
          size={backSize}
          onClick={back}
          disabled={step === 0}
          className="shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>

        <p
          className={cn(
            "text-center font-mono text-[10px] uppercase tracking-[0.1em] text-moss",
            variant === "bar"
              ? "min-w-0 truncate"
              : "hidden whitespace-nowrap sm:block sm:flex-1",
          )}
        >
          {variant === "bar"
            ? `${step + 1} / ${STEPS.length} · ${STEPS[step]}`
            : `${step + 1} / ${STEPS.length}`}
        </p>

        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            size={primarySize}
            onClick={next}
            className="shrink-0"
          >
            Continue <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            type="submit"
            size={primarySize}
            disabled={pending || uploading}
            className="shrink-0"
          >
            {pending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…
              </>
            ) : (
              <>
                Submit<span className="hidden sm:inline"> for review</span>{" "}
                <ChevronDown className="h-3.5 w-3.5 rotate-[-90deg]" />
              </>
            )}
          </Button>
        )}
      </>
    );
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      className="scroll-mt-20 pb-10 sm:pb-[calc(6.5rem+env(safe-area-inset-bottom))]"
    >
      <input type="hidden" name="payload" value={JSON.stringify(payload)} readOnly />
      <input
        type="hidden"
        name="cf-turnstile-response"
        value={turnstileToken}
        readOnly
      />

      <div className="flex items-center gap-2 border-y border-line py-3">
        {STEPS.map((label, index) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px]",
                index < step
                  ? "border-forest bg-forest text-paper"
                  : index === step
                    ? "border-forest text-forest"
                    : "border-line-strong text-moss",
              )}
            >
              {index < step ? <Check className="h-3 w-3" /> : index + 1}
            </span>
            <span
              className={cn(
                "hidden font-mono text-[10px] uppercase tracking-[0.08em] sm:block",
                index === step ? "text-ink" : "text-moss",
              )}
            >
              {label}
            </span>
            {index < STEPS.length - 1 ? (
              <span className="h-px flex-1 bg-line" aria-hidden="true" />
            ) : null}
          </div>
        ))}
      </div>

      {restored ? (
        <div className="mt-4 flex items-center justify-between gap-3 border border-line bg-paper-deep/60 px-4 py-2.5 text-[12px] text-moss">
          <span>Draft restored from this device.</span>
          <button
            type="button"
            className="text-forest underline"
            onClick={() => {
              window.localStorage.removeItem(DRAFT_KEY);
              setDraft(initialDraft());
              setRestored(false);
              setStep(0);
            }}
          >
            Start fresh
          </button>
        </div>
      ) : null}

      {state.message ? (
        <div
          role="alert"
          className="mt-4 border-l-2 border-rust bg-rust/5 px-4 py-3 text-[13px] text-rust"
        >
          {state.message}
        </div>
      ) : null}

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {step === 0 ? (
            <section aria-labelledby="photo-heading">
              <h2 id="photo-heading" className="display text-3xl">
                Your photo, please.
              </h2>
              <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-moss">
                We only publish photos the cook actually took. Screenshots,
                Pinterest saves, stock images and AI-generated food photos get
                rejected — they break the promise that this is real food from
                real kitchens.
              </p>

              <div className="mt-6">
                {draft.imageUrl ? (
                  <div className="border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={draft.imageUrl}
                      alt="Your uploaded dish"
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <div className="flex items-center justify-between gap-3 border-t border-line p-3">
                      <label className="flex items-start gap-2.5 text-[13px] leading-snug">
                        <input
                          type="checkbox"
                          checked={draft.imageAttested}
                          onChange={(event) =>
                            update({ imageAttested: event.target.checked })
                          }
                          className="mt-0.5 h-4 w-4 accent-[#0F3D22]"
                        />
                        <span>
                          I took this photo myself and have the right to publish
                          it.
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          update({
                            imageUrl: "",
                            imageSha256: "",
                            imageAttested: false,
                          })
                        }
                        className="shrink-0 rounded-full border border-line-strong p-2 text-moss hover:text-rust"
                        aria-label="Remove photo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center gap-3 border border-dashed border-line-strong bg-paper-deep/30 px-6 py-14 text-center hover:border-forest"
                  >
                    {uploading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-forest" />
                    ) : (
                      <Camera className="h-6 w-6 text-forest" />
                    )}
                    <span className="text-[14px] font-medium">
                      {uploading ? "Processing photo…" : "Add a photo"}
                    </span>
                    <span className="max-w-xs text-[12px] leading-relaxed text-moss">
                      Required. JPEG, PNG or WebP, up to 10 MB. We convert it
                      to WebP, resize it and strip the location data before
                      publishing.
                    </span>
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadPhoto(file);
                    event.target.value = "";
                  }}
                />
              </div>

              {uploadError ? (
                <p className="mt-2 text-[12px] text-rust">{uploadError}</p>
              ) : null}
              <FieldError>{errors.image}</FieldError>

              <div className="mt-6 border-l-2 border-lime bg-paper-deep/50 px-4 py-3">
                <p className="text-[13px] leading-relaxed text-ink/80">
                  <strong className="font-medium">Phone photos are enough.</strong>{" "}
                  Daylight, a clean plate and no flash beats a styled shoot. We
                  convert it to WebP, resize it and strip the location data.
                </p>
              </div>
            </section>
          ) : null}

          {step === 1 ? (
            <section aria-labelledby="basics-heading" className="space-y-6">
              <div>
                <h2 id="basics-heading" className="display text-3xl">
                  The recipe
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-moss">
                  Write it the way you would tell a friend. We will do the
                  nutrition.
                </p>
              </div>

              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={draft.title}
                  maxLength={90}
                  onChange={(event) => update({ title: event.target.value })}
                  placeholder="Lentil & roasted beet bowl"
                  className="mt-1.5"
                />
                <FieldError>{errors.title}</FieldError>
              </div>

              <div>
                <Label htmlFor="summary" hint="One line is plenty">
                  Summary
                </Label>
                <Textarea
                  id="summary"
                  rows={2}
                  maxLength={240}
                  value={draft.summary}
                  onChange={(event) => update({ summary: event.target.value })}
                  placeholder="Earthy beets, warm lentils and salty feta."
                  className="mt-1.5"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="authorName">Your name</Label>
                  <Input
                    id="authorName"
                    value={draft.authorName}
                    maxLength={60}
                    onChange={(event) =>
                      update({ authorName: event.target.value })
                    }
                    placeholder="As you want to be credited"
                    className="mt-1.5"
                  />
                  <FieldError>{errors.authorName}</FieldError>
                </div>

                <div>
                  <Label htmlFor="country">Country</Label>
                  <Select
                    id="country"
                    value={draft.countryCode}
                    onChange={(event) =>
                      update({ countryCode: event.target.value })
                    }
                    className="mt-1.5"
                  >
                    <option value="">Choose…</option>
                    {countryList.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </Select>
                  <FieldError>{errors.country}</FieldError>
                </div>
              </div>

              <div>
                <Label htmlFor="handle" hint="Optional">
                  Instagram handle
                </Label>
                <Input
                  id="handle"
                  value={draft.handle}
                  maxLength={40}
                  onChange={(event) => update({ handle: event.target.value })}
                  placeholder="@yourkitchen"
                  className="mt-1.5"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                <div>
                  <Label htmlFor="servings">Makes (servings)</Label>
                  <Input
                    id="servings"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={24}
                    value={draft.servings}
                    onChange={(event) =>
                      update({ servings: event.target.value })
                    }
                    className="mt-1.5"
                  />
                  <FieldError>{errors.servings}</FieldError>
                </div>
                <div>
                  <Label htmlFor="prep">Prep (min)</Label>
                  <Input
                    id="prep"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={draft.prepMinutes}
                    onChange={(event) =>
                      update({ prepMinutes: event.target.value })
                    }
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="cook">Cook (min)</Label>
                  <Input
                    id="cook"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={draft.cookMinutes}
                    onChange={(event) =>
                      update({ cookMinutes: event.target.value })
                    }
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="servingNote" hint="Optional">
                    Serving described as
                  </Label>
                  <Input
                    id="servingNote"
                    value={draft.servingNote}
                    maxLength={60}
                    onChange={(event) =>
                      update({ servingNote: event.target.value })
                    }
                    placeholder="1 bowl"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="servingGrams" hint="Optional, improves accuracy">
                    Grams per serving
                  </Label>
                  <Input
                    id="servingGrams"
                    type="number"
                    inputMode="decimal"
                    min={1}
                    value={draft.servingGrams}
                    onChange={(event) =>
                      update({ servingGrams: event.target.value })
                    }
                    placeholder="320"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section aria-labelledby="ingredients-heading">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 id="ingredients-heading" className="display text-3xl">
                    Ingredients
                  </h2>
                  <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-moss">
                    Choose the amount, then the unit. Cups and spoons only appear
                    when USDA has a measured weight for them, so a cup of lentils
                    is never guessed.
                  </p>
                </div>
                <div className="border border-line bg-paper-deep/50 px-4 py-2 text-right">
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-moss">
                    Per serving
                  </p>
                  <p className="mt-0.5 font-mono text-[15px] text-forest">
                    {formatNumber(nutrition.perServing.fiberG)} g fibre ·{" "}
                    {formatNumber(nutrition.perServing.proteinG)} g protein
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {draft.rows.map((row, index) => {
                  const unit = isUnitId(row.unit) ? row.unit : "g";
                  const units = row.food
                    ? availableUnits(row.food.portions)
                    : (["g", "oz"] as const);
                  const grams =
                    row.food && Number(row.amount) > 0
                      ? resolveGrams(Number(row.amount), unit, row.food.portions)
                      : null;

                  return (
                    <div
                      key={row.key}
                      className="border border-line bg-white/60 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-3 w-5 shrink-0 font-mono text-[10px] text-moss">
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap gap-2">
                            <Input
                              aria-label={`Amount for ingredient ${index + 1}`}
                              type="number"
                              inputMode="decimal"
                              step="0.25"
                              min="0"
                              value={row.amount}
                              onChange={(event) =>
                                updateRow(row.key, {
                                  amount: event.target.value,
                                })
                              }
                              placeholder="1"
                              className="h-10 w-20 text-center"
                            />
                            <Select
                              aria-label={`Unit for ingredient ${index + 1}`}
                              value={unit}
                              onChange={(event) =>
                                updateRow(row.key, { unit: event.target.value })
                              }
                              className="h-10 w-24 sm:w-28"
                            >
                              {units.map((option) => (
                                <option key={option} value={option}>
                                  {option === "cup" ? "cups" : option}
                                </option>
                              ))}
                            </Select>
                          </div>

                          <div className="mt-2">
                            {row.food ? (
                              <div className="flex items-start justify-between gap-3 rounded-md border border-line bg-paper px-3 py-2">
                                <div className="min-w-0">
                                  <p className="truncate text-[13px] font-medium">
                                    {row.food.commonName ?? row.food.description}
                                  </p>
                                  <p className="mt-0.5 truncate text-[11px] text-moss">
                                    {row.food.commonName
                                      ? row.food.description
                                      : "USDA FoodData Central"}
                                  </p>
                                  <p className="mt-1 font-mono text-[10px] text-forest">
                                    {grams != null
                                      ? `≈ ${formatNumber(grams)} g`
                                      : "No measured weight for this unit"}
                                    {" · "}
                                    {formatNumber(row.food.fiberG ?? 0)} g fibre /
                                    100 g
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateRow(row.key, {
                                      food: null,
                                      amount: "",
                                      unit: "g",
                                    })
                                  }
                                  className="shrink-0 text-[11px] text-moss underline hover:text-forest"
                                >
                                  Change
                                </button>
                              </div>
                            ) : (
                              <FoodPicker
                                onSelect={(food) =>
                                  updateRow(row.key, {
                                    food,
                                    unit: availableUnits(food.portions).includes(
                                      unit as never,
                                    )
                                      ? unit
                                      : "g",
                                  })
                                }
                              />
                            )}
                          </div>

                          <Input
                            aria-label={`Note for ingredient ${index + 1}`}
                            value={row.note}
                            maxLength={120}
                            onChange={(event) =>
                              updateRow(row.key, { note: event.target.value })
                            }
                            placeholder="Note (optional) — chopped, canned, drained…"
                            className="mt-2 h-10"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              rows:
                                current.rows.length > 2
                                  ? current.rows.filter((item) => item.key !== row.key)
                                  : current.rows,
                            }))
                          }
                          disabled={draft.rows.length <= 2}
                          className="mt-2 shrink-0 rounded-full p-1.5 text-moss hover:text-rust disabled:opacity-30"
                          aria-label={`Remove ingredient ${index + 1}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      rows: [...current.rows, newRow()],
                    }))
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-4 py-2 text-[12px] text-forest hover:border-forest"
                >
                  <Plus className="h-3.5 w-3.5" /> Add ingredient
                </button>
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-moss">
                  {filledRows.length} selected
                  {unconverted ? ` · ${unconverted} need grams` : ""}
                </span>
              </div>

              <FieldError>{errors.ingredients}</FieldError>

              <div className="mt-8 border-t border-line pt-5">
                <p className="eyebrow">Live total</p>
                <dl className="mt-3 grid grid-cols-4 gap-3">
                  {[
                    ["Fibre", nutrition.perServing.fiberG, "g"],
                    ["Protein", nutrition.perServing.proteinG, "g"],
                    ["Calories", nutrition.perServing.kcal, "kcal"],
                    ["Carbs", nutrition.perServing.carbsG, "g"],
                  ].map(([label, value, unit]) => (
                    <div key={`${label}`}>
                      <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-moss">
                        {label}
                      </dt>
                      <dd className="mt-0.5 font-mono text-[17px] text-ink">
                        {formatNumber(Number(value))}
                        <span className="ml-0.5 text-[9px] text-moss">{unit}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-[11px] text-moss">
                  Divided by {servings} serving{servings === 1 ? "" : "s"}, from
                  the ingredients above. Final values are recomputed on the
                  server.
                </p>
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section aria-labelledby="finish-heading" className="space-y-8">
              <div>
                <h2 id="finish-heading" className="display text-3xl">
                  Method, notes and consent
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-moss">
                  Write each step as one action. The cook's note is where the
                  real wisdom goes.
                </p>
              </div>

              <div>
                <p className="eyebrow mb-2">Instructions</p>
                <div className="space-y-3">
                  {draft.steps.map((text, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="mt-3 w-5 shrink-0 font-mono text-[10px] text-moss">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <Textarea
                        rows={2}
                        value={text}
                        maxLength={600}
                        aria-label={`Step ${index + 1}`}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            steps: current.steps.map((item, itemIndex) =>
                              itemIndex === index ? event.target.value : item,
                            ),
                          }))
                        }
                        placeholder="Heat the oven to 200°C and roast the beets…"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            steps:
                              current.steps.length > 2
                                ? current.steps.filter(
                                    (_, itemIndex) => itemIndex !== index,
                                  )
                                : current.steps,
                          }))
                        }
                        disabled={draft.steps.length <= 2}
                        className="mt-2 shrink-0 rounded-full p-1.5 text-moss hover:text-rust disabled:opacity-30"
                        aria-label={`Remove step ${index + 1}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      steps: [...current.steps, ""],
                    }))
                  }
                  className="mt-3 ml-7 inline-flex items-center gap-1.5 rounded-full border border-line-strong px-4 py-2 text-[12px] text-forest hover:border-forest"
                >
                  <Plus className="h-3.5 w-3.5" /> Add step
                </button>
                <FieldError>{errors.steps}</FieldError>
              </div>

              <div>
                <Label htmlFor="tips" hint="Optional">
                  Cook's note
                </Label>
                <Textarea
                  id="tips"
                  rows={3}
                  maxLength={600}
                  value={draft.tips}
                  onChange={(event) => update({ tips: event.target.value })}
                  placeholder="The thing you only learn after making it three times."
                  className="mt-1.5"
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="eyebrow mb-2">Diet</p>
                  <div className="space-y-2">
                    {DIET_TAGS.map((tag) => (
                      <label
                        key={tag}
                        className="flex items-center gap-2.5 text-[13px]"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#0F3D22]"
                          checked={draft.dietTags.includes(tag)}
                          onChange={(event) =>
                            update({
                              dietTags: event.target.checked
                                ? [...draft.dietTags, tag]
                                : draft.dietTags.filter((item) => item !== tag),
                            })
                          }
                        />
                        {TAG_LABELS[tag]}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="eyebrow mb-2">Allergens</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ALLERGENS.map((allergen) => (
                      <label
                        key={allergen.id}
                        className="flex items-center gap-2 text-[12px]"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#0F3D22]"
                          checked={draft.allergens.includes(allergen.id)}
                          onChange={(event) =>
                            update({
                              allergens: event.target.checked
                                ? [...draft.allergens, allergen.id]
                                : draft.allergens.filter(
                                    (item) => item !== allergen.id,
                                  ),
                            })
                          }
                        />
                        {allergen.label}
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-moss">
                    Shown as cook-reported. Always check labels.
                  </p>
                </div>
              </div>

              <div className="space-y-3 border-t border-line pt-5">
                <label className="flex items-start gap-3 text-[12px] leading-relaxed">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-[#0F3D22]"
                    checked={draft.consentLicense}
                    onChange={(event) =>
                      update({ consentLicense: event.target.checked })
                    }
                  />
                  <span>
                    This recipe is mine (or adapted with permission), and the
                    photo — if I added one — is mine. I grant FiberMaxxing a
                    non-exclusive licence to publish, format and promote it with
                    credit to my name and country.{" "}
                    <a
                      href="/submit/terms"
                      target="_blank"
                      className="text-forest underline"
                    >
                      Contributor terms
                    </a>
                    .
                  </span>
                </label>

                <label className="flex items-start gap-3 text-[12px] leading-relaxed">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-[#0F3D22]"
                    checked={draft.consentTerms}
                    onChange={(event) =>
                      update({ consentTerms: event.target.checked })
                    }
                  />
                  <span>
                    I have read the{" "}
                    <a
                      href="/content-policy"
                      target="_blank"
                      className="text-forest underline"
                    >
                      content policy
                    </a>{" "}
                    and the{" "}
                    <a href="/terms" target="_blank" className="text-forest underline">
                      terms of use
                    </a>
                    .
                  </span>
                </label>
                <FieldError>{errors.consent}</FieldError>
              </div>

              {turnstileSiteKey ? (
                <div>
                  <Script
                    src="https://challenges.cloudflare.com/turnstile/v0/api.js"
                    strategy="afterInteractive"
                  />
                  <div ref={widgetRef} />
                </div>
              ) : (
                <p className="text-[11px] text-moss">
                  Spam check is disabled in development.
                </p>
              )}
            </section>
          ) : null}

          {/*
            Phones get the action in the flow of the step: a fixed bar can be
            pushed under a browser toolbar or a scaled preview frame, which
            leaves the form with no visible way forward.
          */}
          <div className="mt-9 flex items-center justify-between gap-3 border-t border-line pt-5 sm:hidden">
            {stepActions("inline")}
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 border border-line bg-paper-deep/40 p-5">
            <p className="eyebrow">Your recipe so far</p>
            <p className="display mt-2 text-2xl leading-tight">
              {draft.title || "Untitled recipe"}
            </p>
            <p className="mt-1 text-[12px] text-moss">
              {draft.authorName || "Your name"}
              {draft.countryCode ? ` · ${draft.countryCode}` : ""}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4">
              <div>
                <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-moss">
                  Fibre / serving
                </dt>
                <dd className="mt-0.5 font-mono text-[24px] text-forest">
                  {formatNumber(nutrition.perServing.fiberG)}
                  <span className="ml-0.5 text-[10px]">g</span>
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-moss">
                  Protein / serving
                </dt>
                <dd className="mt-0.5 font-mono text-[24px]">
                  {formatNumber(nutrition.perServing.proteinG)}
                  <span className="ml-0.5 text-[10px]">g</span>
                </dd>
              </div>
            </dl>

            <div className="mt-5 border-t border-line pt-4 text-[11px] leading-relaxed text-moss">
              <p className="flex items-center gap-2">
                <Check className="h-3 w-3 text-forest" />
                Reviewed by a human before it goes live
              </p>
              <p className="mt-2 flex items-center gap-2">
                <Check className="h-3 w-3 text-forest" />
                Status link so you can follow it
              </p>
              <p className="mt-2 flex items-center gap-2">
                <Check className="h-3 w-3 text-forest" />
                Your name and country, never your email
              </p>
            </div>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 hidden border-t border-line bg-paper/95 backdrop-blur sm:block">
        <div className="container-page flex items-center justify-between gap-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-3">
          {stepActions("bar")}
        </div>
      </div>
    </form>
  );
}
