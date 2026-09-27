import { Suspense } from "react";
import Scanner from "./Scanner";

export default function ScanPage() {
  return (
    <Suspense>
      <Scanner />
    </Suspense>
  );
}
