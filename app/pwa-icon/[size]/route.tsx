import { ImageResponse } from "next/og";

// App icons, drawn once at build time: the "C’26" wordmark on Jodhpur blue.
// "badge" is the small white silhouette Android shows in the status bar.
const VARIANTS = {
  "192": { size: 192, inset: 0 },
  "512": { size: 512, inset: 0 },
  maskable: { size: 512, inset: 0.12 },
  apple: { size: 180, inset: 0 },
  badge: { size: 96, inset: 0 },
} as const;

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((size) => ({ size }));
}

export async function GET(_req: Request, ctx: { params: Promise<{ size: string }> }) {
  const { size: key } = await ctx.params;
  const v = VARIANTS[key as keyof typeof VARIANTS] ?? VARIANTS["192"];
  const s = v.size;

  if (key === "badge") {
    return new ImageResponse(
      (
        <div style={{ width: s, height: s, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: s * 0.62, fontWeight: 900 }}>
          C
        </div>
      ),
      { width: s, height: s }
    );
  }

  const pad = s * v.inset;
  return new ImageResponse(
    (
      <div style={{ width: s, height: s, display: "flex", background: "#2a45a8" }}>
        <div
          style={{
            margin: pad,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#f3ebdc",
          }}
        >
          <div style={{ display: "flex", fontSize: (s - pad * 2) * 0.46, fontWeight: 900, letterSpacing: -2, lineHeight: 1 }}>
            C<span style={{ color: "#efa00b" }}>’26</span>
          </div>
          <div style={{ display: "flex", marginTop: s * 0.04, fontSize: (s - pad * 2) * 0.09, fontWeight: 700, letterSpacing: 2 }}>
            NIFT JODHPUR
          </div>
        </div>
      </div>
    ),
    { width: s, height: s }
  );
}
