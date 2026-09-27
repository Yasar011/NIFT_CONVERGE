"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Renders any text (a student pass, a voting link…) as a QR code. */
export default function QrImage({ value, size = 220, label }: { value: string; size?: number; label: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(value, { margin: 1, width: size * 2, color: { dark: "#15120e", light: "#ffffff" } })
      .then(setSrc)
      .catch(() => setSrc(""));
  }, [value, size]);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={label} width={size} height={size} className="block bg-white" />
  ) : (
    <div style={{ width: size, height: size }} className="animate-pulse bg-paper-2" />
  );
}
