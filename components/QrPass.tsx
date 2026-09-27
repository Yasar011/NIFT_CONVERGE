"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** The student's personal pass — club admins scan it at the event. */
export default function QrPass({ uid, size = 220 }: { uid: string; size?: number }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(`CNV26:${uid}`, { margin: 1, width: size * 2, color: { dark: "#15120e", light: "#ffffff" } })
      .then(setSrc)
      .catch(() => setSrc(""));
  }, [uid, size]);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Your Converge QR pass" width={size} height={size} className="block bg-white" />
  ) : (
    <div style={{ width: size, height: size }} className="animate-pulse bg-paper-2" />
  );
}
