import type { MetadataRoute } from "next";

/** Private application: exclude all crawling (spec §22.3). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
