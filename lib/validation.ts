import { z } from "zod";

import { isUnitId } from "@/lib/nutrition/units";

export const DIET_TAG_VALUES = [
  "vegetarian",
  "vegan",
  "gluten_free",
  "dairy_free",
] as const;

export const ALLERGEN_VALUES = [
  "gluten",
  "dairy",
  "egg",
  "fish",
  "shellfish",
  "nuts",
  "peanuts",
  "soy",
  "sesame",
] as const;

export const ingredientInput = z.object({
  amount: z.number().positive().max(50000),
  unit: z.string().refine(isUnitId, "Unknown unit"),
  foodFdcId: z.string().min(1).max(24),
  note: z.string().trim().max(120).optional().default(""),
});

export const submissionSchema = z.object({
  title: z.string().trim().min(3, "Give it a title").max(90),
  summary: z.string().trim().max(240).optional().default(""),
  authorName: z.string().trim().min(2, "Who cooked it?").max(60),
  authorCountryCode: z.string().trim().length(2, "Pick a country"),
  authorHandle: z.string().trim().max(40).optional().default(""),
  servings: z.number().int().min(1).max(24),
  servingNote: z.string().trim().max(60).optional().default(""),
  servingGrams: z.number().positive().max(5000).nullable().optional(),
  prepMinutes: z.number().int().min(0).max(600).nullable().optional(),
  cookMinutes: z.number().int().min(0).max(600).nullable().optional(),
  tips: z.string().trim().max(600).optional().default(""),
  dietTags: z.array(z.enum(DIET_TAG_VALUES)).max(4).default([]),
  allergens: z.array(z.enum(ALLERGEN_VALUES)).max(9).default([]),
  imageUrl: z.string().trim().min(1, "Add a photo of the dish").max(500),
  imageSha256: z.string().trim().max(64).optional().default(""),
  imageAttested: z
    .boolean()
    .refine((value) => value, "Confirm you took this photo yourself"),
  ingredients: z.array(ingredientInput).min(2, "At least two ingredients").max(30),
  steps: z
    .array(z.string().trim().min(3, "Write the step").max(600))
    .min(2, "At least two steps")
    .max(20),
  termsAccepted: z.literal(true),
  licenseAccepted: z.literal(true),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;

export const reportSchema = z.object({
  kind: z.enum(["copyright", "harmful", "spam", "other"]),
  note: z.string().trim().max(800).optional().default(""),
});

export const dmcaSchema = z.object({
  claimantName: z.string().trim().min(2).max(120),
  claimantEmail: z.string().trim().email().max(200),
  workDescription: z.string().trim().min(10).max(2000),
  infringingUrl: z.string().trim().min(4).max(500),
  goodFaith: z.literal(true),
  accuracy: z.literal(true),
  signature: z.string().trim().min(2).max(120),
});

export const reviewSchema = z.object({
  action: z.enum(["save", "approve", "reject"]),
  title: z.string().trim().min(3).max(90),
  summary: z.string().trim().max(240).optional().default(""),
  tips: z.string().trim().max(600).optional().default(""),
  servings: z.number().int().min(1).max(24),
  servingNote: z.string().trim().max(60).optional().default(""),
  prepMinutes: z.number().int().min(0).max(600).nullable().optional(),
  cookMinutes: z.number().int().min(0).max(600).nullable().optional(),
  reviewNote: z.string().trim().max(600).optional().default(""),
  strike: z.boolean().default(false),
});
