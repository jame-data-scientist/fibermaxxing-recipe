import { ImageResponse } from "next/og";

import { ogFonts } from "@/lib/og";
import { getRecipeBySlug } from "@/lib/queries/recipes";
import { SITE_URL } from "@/lib/site";
import { formatNumber } from "@/lib/utils";

export const runtime = "nodejs";
export const revalidate = 3600;

/**
 * 1080×1350 Instagram card. Every approved recipe gets one, so publishing a
 * recipe also produces the post asset — no separate design pass.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug).catch(() => null);
  const fonts = await ogFonts();

  const title = recipe?.title ?? "FiberMaxxing Kitchen";
  const fiber = recipe ? formatNumber(recipe.fiberG) : "—";
  const protein = recipe ? formatNumber(recipe.proteinG) : "—";
  const kcal = recipe ? Math.round(recipe.kcal) : 0;
  const country = recipe?.authorCountryName ?? "";
  const host = SITE_URL.replace(/^https?:\/\//, "");

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#FBF9F4",
          color: "#12140F",
          padding: "72px 76px",
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 20,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#666A5E",
          }}
        >
          <span>FiberMaxxing Kitchen</span>
          <span>{country}</span>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
            paddingTop: 60,
            paddingBottom: 60,
          }}
        >
          <div style={{ display: "flex", height: 2, width: 96, background: "#0F3D22" }} />
          <div
            style={{
              display: "flex",
              marginTop: 36,
              fontFamily: "Instrument Serif",
              fontSize: title.length > 40 ? 92 : 116,
              lineHeight: 1.0,
              letterSpacing: -2,
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid #D9D2C2" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 16,
              paddingTop: 28,
            }}
          >
            <span style={{ fontSize: 210, lineHeight: 0.85, letterSpacing: -8 }}>{fiber}</span>
            <span
              style={{
                display: "flex",
                flexDirection: "column",
                paddingBottom: 14,
                fontSize: 22,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "#0F3D22",
              }}
            >
              <span>grams</span>
              <span>fibre</span>
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 40,
              paddingTop: 24,
              borderTop: "1px solid #EFEADF",
              fontSize: 26,
            }}
          >
            <span>{protein} g protein</span>
            <span>{kcal} kcal</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 36,
            fontSize: 19,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#666A5E",
          }}
        >
          <span>{host}</span>
          <span>per serving</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, fonts },
  );
}
