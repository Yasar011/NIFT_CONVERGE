// Converge 2026 jersey kit — from the rulebook ("Jersey Kit", pp. 5–14).
// Every student in the final contingent gets the full kit in their campus colours.

export const KIT_IMAGE = "/kit/jodhpur-kit.jpg";

/** NIFT Jodhpur's campus colours (rulebook p. 6). */
export const KIT_COLOURS = [
  { role: "Main colour", name: "Arrowwood (mustard)", pantone: "Pantone 16-0954 TCX", hex: "#BC8D1F" },
  { role: "Accent colour", name: "Syrah (maroon)", pantone: "Pantone 19-1535 TCX", hex: "#6A282C" },
] as const;

export interface KitItem {
  key: "tshirt" | "shorts" | "jacket" | "trackpant";
  name: string;
  fabric: string;
  sizes: string[];
  /** Size chart in inches: column heads (after "Size") and one row per size. */
  head: string[];
  rows: string[][];
}

export const KIT_ITEMS: KitItem[] = [
  {
    key: "tshirt",
    name: "T-shirt",
    fabric: "Dot net — 95% poly, 5% spandex, 210 GSM",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    head: ["To fit chest", "Half chest", "Length", "Shoulder"],
    rows: [
      ["34–36", "18.0", "26.0", "16.5"],
      ["36–38", "19.0", "26.5", "17.5"],
      ["38–40", "20.0", "27.5", "18.0"],
      ["40–42", "21.0", "28.0", "19.0"],
      ["42–44", "22.0", "29.0", "20.0"],
      ["44–46", "23.0", "29.5", "20.5"],
    ],
  },
  {
    key: "shorts",
    name: "Shorts",
    fabric: "Dot net — 95% poly, 5% spandex, 210 GSM",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    head: ["To fit waist", "Outseam", "Inseam", "Hip"],
    rows: [
      ["28", "18.5", "9.0", "36.0"],
      ["30", "19.0", "9.5", "38.0"],
      ["32", "19.5", "10.0", "40.0"],
      ["34", "20.0", "10.0", "42.0"],
      ["36", "20.5", "10.5", "44.0"],
      ["38", "21.0", "10.5", "46.0"],
    ],
  },
  {
    key: "jacket",
    name: "Jacket",
    fabric: "IFC 73 — 95% poly, 5% spandex, 280 GSM",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    head: ["To fit chest", "Half chest", "Length", "Sleeve"],
    rows: [
      ["36", "20.0", "26.0", "23.5"],
      ["38", "21.0", "27.0", "24.0"],
      ["40", "22.0", "27.5", "24.5"],
      ["42", "23.0", "28.0", "25.0"],
      ["44", "24.0", "29.0", "25.5"],
      ["46", "25.0", "30.0", "26.0"],
    ],
  },
  {
    key: "trackpant",
    name: "Track pant (lower)",
    fabric: "IFC 73 — 95% poly, 5% spandex, 280 GSM",
    sizes: ["S", "M", "L", "XL", "2XL"],
    head: ["Relaxed waist", "Stretched waist", "Length", "Inseam"],
    rows: [
      ["26", "28–30", "38", "28"],
      ["28", "30–32", "39", "28.5"],
      ["30", "32–34", "40", "29"],
      ["32", "34–36", "41", "29.5"],
      ["34", "36–38", "42", "30"],
    ],
  },
];

/** Comes in one size (adjustable) — nothing to choose. */
export const KIT_EXTRAS = ["Cap — one size, adjustable (cotton twill)"];

export type KitSizes = Record<KitItem["key"], string>;

export function validateKit(input: Partial<Record<string, unknown>>) {
  const errors: Record<string, string> = {};
  const out = {} as KitSizes;
  for (const item of KIT_ITEMS) {
    const v = String(input[item.key] ?? "");
    if (!item.sizes.includes(v)) errors[item.key] = `Choose a ${item.name.toLowerCase()} size.`;
    else out[item.key] = v;
  }
  return { errors, kit: out };
}

export const kitComplete = (k?: Partial<KitSizes> | null) => !!k && KIT_ITEMS.every((i) => !!k[i.key]);
