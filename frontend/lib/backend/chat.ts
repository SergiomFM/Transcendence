import { CHAT_BACKEND_URL } from "./config";
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
  id?: number;
  from: string;
  to: string;
  roomId: string;
  timestamp: string;
  self: boolean;
};

export type PendingGameInvite = {
  id: number;
  from: string;
  to: string;
  roomId: string;
  timestamp: string;
};

export type UnreadSummaryEntry = {
  from: string;
  count: number;
  lastMessage: string;
  lastTimestamp: string;
};

export type ChatEvent =
  | ChatMessage
  | GameInviteEvent
  | { type: "online_users"; users: string[] }
  | { type: "user_online"; username: string }
  | { type: "user_offline"; username: string }
  | { type: "unread_summary"; entries: UnreadSummaryEntry[] }
  | { type: "pending_game_invites"; invites: PendingGameInvite[] }
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

  /** Get the SSE events URL for a given username */
  sseUrl: (username: string) =>
    `${CHAT_BACKEND_URL}/events/${encodeURIComponent(username)}`,

  /** Send a message via REST */
  sendMessage: (senderUsername: string, receiverUsername: string, content: string) =>
    sendRequest({
      url: `${CHAT_BACKEND_URL}/sendMessage`,
      method: Method.POST,
      body: { senderUsername, receiverUsername, content },
    }),

  /** Send a game invite via REST */
  sendGameInvite: (senderUsername: string, receiverUsername: string, roomId: string) =>
    sendRequest({
      url: `${CHAT_BACKEND_URL}/sendGameInvite`,
      method: Method.POST,
      body: { senderUsername, receiverUsername, roomId },
    }),

  /** Mark all messages from a sender as read for the receiver */
  markRead: (senderUsername: string, receiverUsername: string) =>
    sendRequest({
      url: `${CHAT_BACKEND_URL}/markRead`,
      method: Method.POST,
      body: { senderUsername, receiverUsername },
    }),

  /** Accept a game invite (mark as accepted in DB) */
  acceptGameInvite: (receiverUsername: string, inviteId?: number, roomId?: string) =>
    sendRequest({
      url: `${CHAT_BACKEND_URL}/acceptGameInvite`,
      method: Method.POST,
      body: { receiverUsername, inviteId, roomId },
    }),
};
