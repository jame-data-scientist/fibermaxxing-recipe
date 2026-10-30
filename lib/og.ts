import { readFile } from "node:fs/promises";
import path from "node:path";

type OgFont = {
  name: string;
  data: Buffer;
  weight: 400 | 600;
  style: "normal";
};

let cached: OgFont[] | null = null;

/** Satori needs TTF/OTF, so the two fonts are bundled rather than fetched. */
export async function ogFonts(): Promise<OgFont[]> {
  if (cached) return cached;
  const dir = path.join(process.cwd(), "assets", "fonts");
  const [serif, sans, sansBold] = await Promise.all([
    readFile(path.join(dir, "InstrumentSerif-Regular.ttf")),
    readFile(path.join(dir, "Inter-Regular.ttf")),
    readFile(path.join(dir, "Inter-SemiBold.ttf")),
  ]);

  cached = [
    { name: "Instrument Serif", data: serif, weight: 400, style: "normal" },
    { name: "Inter", data: sans, weight: 400, style: "normal" },
    { name: "Inter", data: sansBold, weight: 600, style: "normal" },
  ];
  return cached;
}
