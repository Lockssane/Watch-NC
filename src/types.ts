export type CommandActionType =
  | "navigation"
  | "highlight"
  | "filter"
  | "explain"
  | "demo"
  | "compare"
  | "environment"
  | "focus"
  | "none";

export type ViewMode = "global" | "maps" | "ais" | "ocean" | "control";
export type EnvironmentMode = "radar" | "satellite" | "night" | "storm" | "tactical";
export type FilterMode = "all" | "commercial" | "fishing" | "sar" | "alerts";

export interface CommandAction {
  type: CommandActionType;
  target: string;
  parameters: Record<string, string | number | boolean>;
}

export interface AgentResponse {
  message: string;
  action: CommandAction;
  suggestions: string[];
}

export interface ShipTrack {
  id: string;
  name: string;
  type: "Commercial" | "Plaisance" | "Recherche & Sauvetage" | "Patrouille";
  status: "Nominal" | "Surveille" | "Alerte";
  heading: number;
  speed: number;
  zone: string;
  position: [number, number, number];
  route: [number, number, number][];
}

export interface PresenceCursor {
  id: string;
  label: string;
  color: string;
  x: number;
  y: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  payload?: AgentResponse;
}

export interface Ping {
  id: string;
  x: number;
  y: number;
}
