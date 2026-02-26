export type GameMode = "menu" | "local" | "local-2p" | "local-ai" | "online" | "multiplayer";

export interface ChatMessage {
  id: string;
  userId: string | null;
  name: string;
  avatar: string | null;
  role: "player" | "spectator";
  content: string;
  timestamp: number;
}

export interface RoomUser {
  id: string | null;
  name: string | null;
  avatar: string | null;
  role: "player" | "spectator";
  playerSlot: number | null;
}
