import type { MetadataRoute } from "next";

import { recipeSlugs } from "@/lib/queries/recipes";
import { absoluteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), priority: 1, changeFrequency: "daily" },
    { url: absoluteUrl("/recipes"), priority: 0.9, changeFrequency: "daily" },
    { url: absoluteUrl("/submit"), priority: 0.7, changeFrequency: "monthly" },
    { url: absoluteUrl("/about"), priority: 0.5, changeFrequency: "yearly" },
    {
      url: absoluteUrl("/content-policy"),
      priority: 0.3,
      changeFrequency: "yearly",
    },
    { url: absoluteUrl("/terms"), priority: 0.3, changeFrequency: "yearly" },
    { url: absoluteUrl("/privacy"), priority: 0.3, changeFrequency: "yearly" },
    { url: absoluteUrl("/dmca"), priority: 0.3, changeFrequency: "yearly" },
  ];

  const staticPages: MetadataRoute.Sitemap = entries.map((entry) => ({
    ...entry,
    lastModified: new Date(),
  }));

  const slugs = await recipeSlugs().catch(() => []);

  const recipes: MetadataRoute.Sitemap = slugs.map((recipe) => ({
    url: absoluteUrl(`/recipes/${recipe.slug}`),
    lastModified: recipe.publishedAt ?? new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticPages, ...recipes];
}
