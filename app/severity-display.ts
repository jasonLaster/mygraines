// How a severity (1-10) is presented: level name, weather icon and colours.
// Shared by the screens and the calendar.

export type SeverityLevel = "High" | "Moderate" | "Mild" | "Low";

export function getSeverityDetails(severity: number): {
  level: SeverityLevel;
  icon: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
} {
  if (severity >= 8) {
    return {
      level: "High",
      icon: "thunderstorm",
      colorClass: "text-red-400",
      bgClass: "bg-red-900/20",
      borderClass: "border-red-900/30",
      textClass: "text-red-300",
    };
  } else if (severity >= 5) {
    return {
      level: "Moderate",
      icon: "rainy",
      colorClass: "text-orange-400",
      bgClass: "bg-orange-900/20",
      borderClass: "border-orange-900/30",
      textClass: "text-orange-300",
    };
  } else if (severity >= 3) {
    return {
      level: "Mild",
      icon: "cloud",
      colorClass: "text-yellow-400",
      bgClass: "bg-yellow-900/20",
      borderClass: "border-yellow-900/30",
      textClass: "text-yellow-300",
    };
  } else {
    return {
      level: "Low",
      icon: "partly_cloudy_day",
      colorClass: "text-blue-400",
      bgClass: "bg-blue-900/20",
      borderClass: "border-blue-900/30",
      textClass: "text-blue-300",
    };
  }
}
