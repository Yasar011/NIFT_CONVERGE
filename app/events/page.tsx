import SectionHeading from "@/components/SectionHeading";
import EventsExplorer from "@/components/EventsExplorer";

export const metadata = {
  title: "Events | NIFT Jodhpur Converge 2026",
};

export default function EventsPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <SectionHeading
        eyebrow="Event Explorer"
        title="All CONVERGE 2026 events"
        description="Search or filter by category. Every event, its participant requirements and rules are sourced directly from the official CONVERGE 2026 Rule Book."
      />
      <div className="mt-10">
        <EventsExplorer />
      </div>
    </div>
  );
}
