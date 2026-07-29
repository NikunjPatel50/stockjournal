import type {
  DisciplineRule,
  Milestone,
  WeekDayAdherence,
} from "@/lib/goals";

export const defaultDisciplineRules: DisciplineRule[] = [
  {
    id: "rule-1",
    label: "Stopped trading after 2 consecutive losses",
    checked: false,
  },
  {
    id: "rule-2",
    label: "Maintained max risk per position",
    checked: false,
  },
  {
    id: "rule-3",
    label: "Logged trade thoughts/psychology in Journal",
    checked: false,
  },
  {
    id: "rule-4",
    label: "Followed predefined entry/exit strategy",
    checked: false,
  },
  {
    id: "rule-5",
    label: "No revenge trades after stop-out",
    checked: false,
  },
];

export const defaultWeekAdherence: WeekDayAdherence[] = [
  { day: "Mon", adhered: false },
  { day: "Tue", adhered: false },
  { day: "Wed", adhered: false },
  { day: "Thu", adhered: false },
  { day: "Fri", adhered: false },
];

export const defaultMilestones: Milestone[] = [];
