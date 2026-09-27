import QrImage from "./QrImage";

/** The student's personal pass — club admins scan it at the event. */
export default function QrPass({ uid, size = 220 }: { uid: string; size?: number }) {
  return <QrImage value={`CNV26:${uid}`} size={size} label="Your Converge QR pass" />;
}
