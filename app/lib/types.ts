export type SeverityLevel = "High" | "Moderate" | "Mild" | "Low";

export type ViewState = "list" | "new" | "edit";

export type FilterState = "All" | SeverityLevel;

export interface SeverityDetails {
  level: SeverityLevel;
  icon: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}
