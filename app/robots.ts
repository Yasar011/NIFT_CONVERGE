import type { MetadataRoute } from "next";

/** Search engines may list the public pages, never the private ones. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/me", "/api/", "/login", "/v/", "/vote"] },
  };
}
