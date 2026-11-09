import type { NextConfig } from "next";

// Safety headers on every page and API response.
const security = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // No other site may show these pages inside a frame (stops click-jacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  // Camera only for this site's own QR scanner.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
];
// Student data must never be kept by a browser/proxy cache or shown on Google.
const privateArea = [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: security },
      { source: "/api/:path*", headers: [...privateArea, { key: "Cache-Control", value: "private, no-store, max-age=0" }] },
      { source: "/admin/:path*", headers: privateArea },
      { source: "/admin", headers: privateArea },
      { source: "/me", headers: privateArea },
      { source: "/login", headers: privateArea },
      { source: "/v/:path*", headers: privateArea },
    ];
  },
};

export default nextConfig;
