import { Suspense } from "react";
import MyConverge from "./MyConverge";

export const metadata = { title: "My Converge | NIFT Jodhpur Converge 2026" };

export default function MePage() {
  return (
    <Suspense>
      <MyConverge />
    </Suspense>
  );
}
