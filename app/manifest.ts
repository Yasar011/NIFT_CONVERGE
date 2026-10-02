import type { MetadataRoute } from "next";

/** Makes the site installable ("Add to Home Screen") — required for iPhone notifications. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NIFT Jodhpur × Converge 2026",
    short_name: "Converge ’26",
    description: "Registration, selection, trials and live voting for NIFT Jodhpur's Converge 2026 contingent.",
    start_url: "/me",
    scope: "/",
    display: "standalone",
    background_color: "#f3ebdc",
    theme_color: "#2a45a8",
    orientation: "portrait",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
