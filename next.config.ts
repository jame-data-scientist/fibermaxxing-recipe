import type { NextConfig } from "next";

const r2Host = (() => {
  const base = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (!base) return null;
  try {
    return new URL(base).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns: r2Host
      ? [{ protocol: "https" as const, hostname: r2Host }]
      : [],
  },
};

export default nextConfig;
