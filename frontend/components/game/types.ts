export type GameMode = "menu" | "local" | "online" | "multiplayer";

export interface ChatMessage {
  id: string;
  userId: string | null;
  name: string;
  avatar: string | null;
  role: "player" | "spectator";
  content: string;
  timestamp: number;
}
