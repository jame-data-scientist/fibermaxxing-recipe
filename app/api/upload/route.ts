import { NextResponse } from "next/server";

import { checkRateLimit, recordEvent } from "@/lib/rate-limit";
import { requestMeta } from "@/lib/request";
import { storeImage } from "@/lib/upload";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { ipHash } = await requestMeta();

  const limit = await checkRateLimit(ipHash, "upload", {
    perHour: 20,
    perDay: 60,
  });
  if (!limit.ok) {
    return NextResponse.json({ error: limit.message }, { status: 429 });
  }

  let file: FormDataEntryValue | null = null;
  try {
    const form = await request.formData();
    file = form.get("file");
  } catch {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }

  try {
    const stored = await storeImage(file);
    await recordEvent(ipHash, "upload");
    return NextResponse.json(stored);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upload failed. Try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
