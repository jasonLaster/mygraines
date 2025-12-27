const currentYear = new Date().getFullYear();

export const MIN_DATE = `${currentYear}-01-01T00:00`;
export const MAX_DATE = `${currentYear}-12-31T23:59`;

export const TRIGGERS = [
  "Crohns",
  "Coffee",
  "Sleep",
  "Stress",
  "Dehydration",
  "Other",
] as const;

export type Trigger = (typeof TRIGGERS)[number];
