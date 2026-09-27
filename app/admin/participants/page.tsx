import { Suspense } from "react";
import Participants from "./Participants";

export default function ParticipantsPage() {
  return (
    <Suspense>
      <Participants />
    </Suspense>
  );
}
