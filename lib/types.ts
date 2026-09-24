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

export interface CategoryMeta {
  label: string;
  short: string;
  description: string;
  // Tailwind classes for the arena's signature colour block.
  bg: string;
  text: string;
  onColor: string;
}

export const CATEGORY_META: Record<EventCategory, CategoryMeta> = {
  sports: {
    label: "Sports",
    short: "Sports",
    description:
      "Track & field, court and combat sports contested individually and in teams.",
    bg: "bg-sindoor",
    text: "text-sindoor",
    onColor: "text-paper",
  },
  cultural: {
    label: "Cultural",
    short: "Cultural",
    description: "Music, dance, personality and design showcases on the main stage.",
    bg: "bg-rani",
    text: "text-rani",
    onColor: "text-paper",
  },
  literary: {
    label: "Literary & Creative",
    short: "Literary",
    description: "Art, storytelling, improvisation and idea-pitching events.",
    bg: "bg-blue",
    text: "text-blue",
    onColor: "text-paper",
  },
  esse: {
    label: "ESSE",
    short: "ESSE",
    description: "Street theatre, spoken word, comedy and face art.",
    bg: "bg-marigold",
    text: "text-ink",
    onColor: "text-ink",
  },
  photography: {
    label: "Adventure & Photography",
    short: "Photography",
    description: "Short film, concept photography and reel making.",
    bg: "bg-peacock",
    text: "text-peacock",
    onColor: "text-paper",
  },
};

export const CATEGORY_ORDER: EventCategory[] = [
  "sports",
  "cultural",
  "literary",
  "esse",
  "photography",
];
