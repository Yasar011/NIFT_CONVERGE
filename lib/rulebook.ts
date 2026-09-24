export const GENERAL_GUIDELINES: { title: string; points: string[] }[] = [
  {
    title: "Participant Strength & Registration",
    points: [
      "As per NIFT regulations, each participating campus may bring a maximum of 50 participants.",
      "Registration of all 50 participants, including event registrations and substitutes, is completed by the Campus SDAC through CMS login credentials within the stipulated timeline.",
      "The Campus SDAC is responsible for the accuracy and completeness of all registration details. No changes are ordinarily permitted after registration closes.",
    ],
  },
  {
    title: "Identification & ID Cards",
    points: [
      "All participants must produce a valid NIFT ID card at the time of registration.",
      "Converge-specific ID cards must be carried and displayed whenever required throughout the event.",
      "Participants unable to establish their identity when requested may be denied entry or participation.",
    ],
  },
  {
    title: "Reporting, Punctuality & Time Compliance",
    points: [
      "Participants must report at least 30 minutes before their event's scheduled start, unless otherwise specified.",
      "Arriving more than 15 minutes after the scheduled time may be treated as forfeiting the opportunity to participate.",
      "Participants must strictly follow the time limits prescribed for each event; failure may result in penalty, reduced marks, disqualification, or forfeiture.",
    ],
  },
  {
    title: "Theme Conformity & Jury Decisions",
    points: [
      "Where a theme is prescribed, participants must adhere to it. Significant deviation may affect evaluation and attract penalties.",
      "The decision of the duly constituted Judges/Jury is final and binding on evaluation, scoring, ranking, and rule interpretation, subject to the prescribed appeal mechanism.",
    ],
  },
  {
    title: "Anonymity & Campus Identity",
    points: [
      "Except in sports events or events specifically exempted, participants must not reveal their campus identity during the event.",
      "Deliberately disclosing campus identity in violation of event rules may result in disqualification.",
      "In sports events, participants may openly represent their campuses.",
    ],
  },
  {
    title: "Content & Conduct Standards",
    points: [
      "Offensive, obscene, discriminatory, defamatory, hateful, threatening, or otherwise inappropriate language, imagery, gestures, or content is strictly prohibited.",
      "Harassment, bullying, intimidation, discrimination, abusive behaviour, physical altercations, or threatening conduct will not be tolerated.",
      "Violations may attract penalties, disqualification, or disciplinary action depending on severity.",
    ],
  },
  {
    title: "Submission Requirements",
    points: [
      "Soft-copy submissions must be in the prescribed format, within the deadline, and made only through the specified email/platform.",
      "Files must be readable, accessible, and properly labelled. Participants are responsible for ensuring successful, timely submission.",
    ],
  },
  {
    title: "Attire & Equipment",
    points: [
      "Participants must wear designated campus representation attire wherever prescribed, particularly during ceremonies, parades, and common gatherings.",
      "For sports events, participants must carry their own prescribed gear, kits, footwear, and protective equipment, and are responsible for its safe custody and use. Only equipment permitted under the event rules may be used.",
    ],
  },
  {
    title: "Prohibited Substances & Conduct",
    points: [
      "Consumption, possession, distribution, or sale of alcohol, narcotic drugs, psychotropic substances, or any intoxicating/prohibited substance is strictly prohibited across all Converge venues.",
      "Smoking, vaping, and tobacco use are strictly prohibited on campus, accommodation, and event venues, subject to applicable law.",
      "Violation may result in immediate removal from the event and disciplinary action under applicable NIFT rules.",
    ],
  },
  {
    title: "Photography, Social Media & Personal Belongings",
    points: [
      "Photography/videography is permitted only in areas where allowed, particularly respecting venue-specific security restrictions.",
      "Participants are encouraged to share their Converge experience responsibly, respecting others' privacy and consent, and avoiding offensive or misleading content.",
      "Participants are responsible for the safe custody of their own mobile phones, laptops, valuables, documents, cash, and equipment.",
    ],
  },
  {
    title: "Safety, Schedule & Compliance",
    points: [
      "Participants must follow instructions from medical, security, fire-safety, or emergency personnel, and remain within designated areas.",
      "The Organising Committee reserves the right to modify schedules, venues, or reporting times; participants must follow the latest official communication.",
      "Participants and Campus SDACs must rely only on official communications issued by NIFT / the Converge 2026 Organising Committee for all instructions.",
    ],
  },
  {
    title: "Appeals & Disputes",
    points: [
      "A participating campus may raise an appeal on a genuine procedural or rule-related issue, through the prescribed channel and within the stipulated time.",
      "A false, misleading, frivolous, or intentionally incorrect appeal may result in a deduction of Gold, Silver, or Bronze Points from the concerned campus.",
      "Disputes are considered by a committee comprising a Director and SDACs from non-hosting campuses, along with the CAC and SDAC of the host campus; its decision is binding.",
    ],
  },
];

export const CONVERGE_CUP = {
  description:
    "The Converge Cup celebrates the team that rises above across the spectrum of events, demonstrating consistency, excellence, teamwork, and competitive spirit. It is awarded to the campus that earns the highest cumulative points throughout Converge.",
  points: [
    { position: "Gold", points: 5 },
    { position: "Silver", points: 3 },
    { position: "Bronze", points: 1 },
  ],
  tiebreaker:
    "In case of a tie, the campus with more Gold positions ranks higher; if still tied, Silver positions are considered, followed by Bronze positions.",
};

export const FAIR_PLAY_AWARD = {
  description:
    "The Fair Play Award honours the campus that best embodies the true spirit of Converge — sportsmanship, discipline, conduct, integrity, teamwork, and respect for fellow participants, coordinators, and event rules.",
  criteria: [
    { name: "Respect & Sportsmanship", marks: 4 },
    { name: "Integrity & Rule Following", marks: 4 },
    { name: "Team Spirit & Cooperation", marks: 4 },
    { name: "Grace & Conduct", marks: 4 },
    { name: "Inclusivity & Positive Attitude", marks: 4 },
  ],
  totalMarks: 20,
  tiebreakerSteps: [
    "Higher Integrity & Rule Following score takes precedence.",
    "If still tied, higher Respect & Sportsmanship score takes precedence.",
    "If still tied, higher Team Spirit & Cooperation score takes precedence.",
    "If still tied, higher Inclusivity & Positive Attitude score takes precedence.",
    "If still tied, the Fair Play Jury makes the final decision based on documented observations.",
  ],
};

export const KNOW_BEFORE_YOU_REGISTER: string[] = [
  "Participants must carry a valid NIFT ID card at all times.",
  "Participants must follow prescribed reporting times — at least 30 minutes before an event, unless stated otherwise.",
  "Arriving more than 15 minutes late may be treated as forfeiting the opportunity to participate.",
  "Event-specific time limits must be strictly followed; exceeding them can lead to marks deduction or disqualification.",
  "Where a theme is prescribed, it must be followed — deviation can affect evaluation or lead to disqualification.",
  "The Judges'/Jury's decision is final and binding, subject to the prescribed appeal mechanism.",
  "Except in sports events, participants must not reveal their campus identity during the event.",
  "Offensive, obscene, discriminatory, hateful, or otherwise inappropriate content is strictly prohibited.",
  "Soft-copy submissions must follow the prescribed format, platform, and deadline.",
  "Campus representation attire must be worn wherever prescribed.",
  "Participants are personally responsible for the safe custody of their belongings.",
  "Prohibited substances (alcohol, narcotics, psychotropic substances) are strictly not permitted.",
  "Smoking, vaping, and tobacco use are strictly prohibited across all Converge venues.",
  "Photography/videography is subject to venue-specific restrictions, particularly at secured venues.",
  "Participants must follow all safety instructions and venue-specific guidance at all times.",
];
