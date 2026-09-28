import { Suspense } from "react";
import TeamBuilder from "./TeamBuilder";

export default function TeamsPage() {
  return (
    <Suspense>
      <TeamBuilder />
    </Suspense>
  );
}
