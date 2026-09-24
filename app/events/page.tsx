import PageHeader from "@/components/PageHeader";
import EventsExplorer from "@/components/EventsExplorer";
import { EVENTS } from "@/lib/events";

export const metadata = {
  title: "Events | NIFT Jodhpur Converge 2026",
};

export default function EventsPage() {
  return (
    <>
      <PageHeader
        kicker={`${EVENTS.length} events · 5 arenas`}
        title={<>The full<br />programme</>}
        intro="Every event, participant limit and rule here is taken from the official CONVERGE 2026 Rule Book. Filter by arena or search by name."
      />
      <div className="mx-auto max-w-[1400px] px-4 pb-24 sm:px-8">
        <EventsExplorer />
      </div>
    </>
  );
}
