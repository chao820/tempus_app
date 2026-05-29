export interface Landmark {
  id: string;
  name: string;
  emoji: string;
  description: string;
  lat?: number;
  lng?: number;
}

export type TravelMode = "transit" | "walk" | "drive" | "bicycling";

export interface ScheduledTask {
  id: string;
  rawTime: string; // Target event start time, e.g. "14:30"
  title: string;
  buffer: number; // Cushion time in minutes (default 15)
  fromLoc: string; // Landmark ID
  toLoc: string; // Landmark ID
  travelMode: TravelMode;
  commuteTime: number; // Actual estimated travel baseline duration in minutes
  status: "scheduled" | "completed" | "delayed" | "missed";
  actualDepartureTime?: string;
  actualStartTime?: string;
  comment?: string;
  coachAdvice?: string;
  funnyFact?: string;
}

export type ProcrastinationLevel = "mild" | "heavy" | "master";

export type ButlerTheme = "classic" | "star_idol" | "racing" | "anime" | "fitness" | "cats_master" | "workplace" | "custom";

export interface ButlerConfig {
  theme: ButlerTheme;
  customName: string;
  customPersonality: string;
  procrastinationLevel: ProcrastinationLevel;
}

export interface DiaryEntry {
  markdown: string;
  date: string;
  rate: number;
}
