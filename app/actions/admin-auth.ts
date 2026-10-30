"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  adminConfigured,
  clearAdminCookie,
  setAdminCookie,
  verifyAdminKey,
} from "@/lib/admin";

export async function signInWithKey(formData: FormData) {
  if (!adminConfigured()) {
    redirect(
      `/admin/login?error=${encodeURIComponent(
        "ADMIN_KEY is not set (minimum 8 characters). Add it to the environment first.",
      )}`,
    );
  }

  const key = String(formData.get("key") ?? "");
  if (!verifyAdminKey(key)) {
    redirect(
      `/admin/login?error=${encodeURIComponent("That key did not work.")}`,
    );
  }

  await setAdminCookie();
  revalidatePath("/admin");
  redirect("/admin");
}

export async function signOutAdmin() {
  await clearAdminCookie();
  redirect("/");
}
