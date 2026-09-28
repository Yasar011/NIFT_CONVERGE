import { Suspense } from "react";
import PrintSheet from "./PrintSheet";

export default function PrintPage() {
  return (
    <Suspense>
      <PrintSheet />
    </Suspense>
  );
}
