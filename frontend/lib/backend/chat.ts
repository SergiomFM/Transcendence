import { CHAT_BACKEND_URL, CHAT_WS_URL } from "./config";
import { sendRequest, Method } from "./request";

export type ChatMessage = {
  id: number;
  type: "message";
  from: string;
  to: string;
  content: string;
  timestamp: string;
  self: boolean;
};

export type GameInviteEvent = {
  type: "game_invite";
  from: string;
  to: string;
  roomId: string;
  timestamp: string;
  self: boolean;
};

export type ChatEvent =
  | ChatMessage
  | GameInviteEvent
  | { type: "online_users"; users: string[] }
  | { type: "user_online"; username: string }
  | { type: "user_offline"; username: string }
  | { type: "error"; message: string };

export const Chat = {
  /** Ensure a chat user record exists for this username */
  register: (username: string) =>
    sendRequest({
      url: `${CHAT_BACKEND_URL}/register`,
      method: Method.POST,
      body: { username },
    }),

  /** Fetch message history between two users */
  getMessages: (user: string, otherUser: string, n = 50) =>
    sendRequest<ChatMessage[]>({
      url: `${CHAT_BACKEND_URL}/messages`,
      method: Method.GET,
      params: { user, otherUser, n: String(n) },
    }),

  /** Get the WebSocket URL for a given username */
  wsUrl: (username: string) => `${CHAT_WS_URL}/${encodeURIComponent(username)}`,
};
