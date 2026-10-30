import { ImageResponse } from "next/og";

import { ogFonts } from "@/lib/og";
import { getRecipeBySlug } from "@/lib/queries/recipes";
import { formatNumber } from "@/lib/utils";

export const runtime = "nodejs";
export const alt = "A recipe from FiberMaxxing Kitchen";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug).catch(() => null);
  const fonts = await ogFonts();

  const title = recipe?.title ?? "FiberMaxxing Kitchen";
  const fiber = recipe ? formatNumber(recipe.fiberG) : "—";
  const protein = recipe ? formatNumber(recipe.proteinG) : "—";
  const country = recipe?.authorCountryName ?? "Real cooks, real numbers";

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
          padding: "56px 64px",
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 17,
            letterSpacing: 3,
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
            alignItems: "flex-end",
            paddingTop: 40,
            paddingBottom: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Instrument Serif",
              fontSize: title.length > 44 ? 72 : 92,
              lineHeight: 1.02,
              letterSpacing: -1,
              maxWidth: 980,
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            borderTop: "1px solid #D9D2C2",
            paddingTop: 22,
            gap: 64,
          }}
        >
          {[
            { value: fiber, label: "g fibre / serving" },
            { value: protein, label: "g protein / serving" },
          ].map((stat) => (
            <div key={stat.label} style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 46, letterSpacing: -1 }}>{stat.value}</span>
              <span
                style={{
                  fontSize: 13,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "#666A5E",
                }}
              >
                {stat.label}
              </span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              marginLeft: "auto",
              alignItems: "flex-end",
              fontSize: 13,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#0F3D22",
            }}
          >
            fibermaxxing
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
