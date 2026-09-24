export type EventCategory =
  | "sports"
  | "cultural"
  | "literary"
  | "esse"
  | "photography";

export type EventFormat = "Individual" | "Team" | "Duet" | "Group" | "Open" | "Solo/Duet";

export interface ConvergeEvent {
  slug: string;
  name: string;
  category: EventCategory;
  format: EventFormat;
  participantsLabel: string;
  participantsCount?: number;
  substitutes?: string;
  genderNote?: string;
  theme?: string;
  timeLimit?: string;
  about: string;
  requirements: string[];
  rules: string[];
  whatYouNeed?: string[];
  important?: string[];
  evaluationCriteria?: string[];
  nonCompetitive?: boolean;
}

export const CATEGORY_META: Record<
  EventCategory,
  { label: string; short: string; description: string }
> = {
  sports: {
    label: "Sports",
    short: "Sports",
    description:
      "Track & field, court and combat sports contested individually and in teams.",
  },
  cultural: {
    label: "Cultural",
    short: "Cultural",
    description: "Music, dance, personality and design showcases on the main stage.",
  },
  literary: {
    label: "Literary & Creative",
    short: "Literary",
    description: "Art, storytelling, improvisation and idea-pitching events.",
  },
  esse: {
    label: "ESSE",
    short: "ESSE",
    description: "Street theatre, spoken word, comedy and face art.",
  },
  photography: {
    label: "Adventure & Photography",
    short: "Photography",
    description: "Short film, concept photography and reel making.",
  },
};
