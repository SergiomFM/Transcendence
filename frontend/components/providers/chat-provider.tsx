"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-provider";
import { Chat, type ChatMessage, type ChatEvent, type GameInviteEvent } from "@/lib/backend/chat";

export interface UnreadEntry {
  /** Username of the sender */
  from: string;
  /** Number of unread messages from this sender */
  count: number;
  /** The most recent unread message content */
  lastMessage: string;
  /** Timestamp of the most recent unread message */
  lastTimestamp: string;
}

export interface GameInvite {
  /** Database ID of the invite */
  id?: number;
  /** Username of the sender */
  from: string;
  /** Game room ID to join */
  roomId: string;
  /** When the invite was sent */
  timestamp: string;
}

interface ChatContextType {
  /** Set of currently online usernames */
  onlineUsers: Set<string>;
  /** All messages for the currently active conversation */
  messages: ChatMessage[];
  /** Set messages (used by the chat page when loading history) */
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  /** Total unread message count (across all conversations) */
  unreadCount: number;
  /** Per-sender unread entries for the notification dropdown */
  unreadEntries: UnreadEntry[];
  /** Clear unread count for a specific sender, or all if no sender given */
  clearUnread: (sender?: string) => void;
  /** Send a message via REST */
  sendMessage: (to: string, content: string) => boolean;
  /** Send a game invite via REST */
  sendGameInvite: (to: string, roomId: string) => boolean;
  /** Pending game invites received from friends */
  gameInvites: GameInvite[];
  /** Dismiss a game invite */
  clearGameInvite: (roomId: string) => void;
  /** All game invite events (for rendering in chat) */
  gameInviteEvents: GameInviteEvent[];
  /** Whether the SSE connection is active */
  isConnected: boolean;
  /** The username of the chat currently being viewed (null if none) */
  activeChatUser: string | null;
  /** Set the currently active chat user (suppresses unread for that user) */
  setActiveChatUser: (username: string | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

type UnreadData = {
  count: number;
  lastMessage: string;
  lastTimestamp: string;
};

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadEntries, setUnreadEntries] = useState<UnreadEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [gameInvites, setGameInvites] = useState<GameInvite[]>([]);
  const [gameInviteEvents, setGameInviteEvents] = useState<GameInviteEvent[]>([]);
  const [activeChatUser, setActiveChatUserState] = useState<string | null>(null);

  // Track unread messages per sender: username → { count, lastMessage, lastTimestamp }
  const unreadMapRef = useRef<Map<string, UnreadData>>(new Map());
  const activeChatUserRef = useRef<string | null>(null);
  const myUsernameRef = useRef<string | null>(null);

  const myUsername = user ? (user.alias || user.username) : null;

  useEffect(() => {
    myUsernameRef.current = myUsername;
  }, [myUsername]);

  // Sync unreadMapRef → state
  const syncUnreadState = useCallback(() => {
    let total = 0;
    const entries: UnreadEntry[] = [];
    for (const [from, data] of unreadMapRef.current.entries()) {
      total += data.count;
      entries.push({ from, ...data });
    }
    // Sort by most recent first
    entries.sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime());
    setUnreadCount(total);
    setUnreadEntries(entries);
  }, []);

  // Clear unread for a specific sender or all
  const clearUnread = useCallback((sender?: string) => {
    const me = myUsernameRef.current;
    if (sender) {
      unreadMapRef.current.delete(sender);
      // Mark as read on the server so they stay read across sessions
      if (me) {
        Chat.markRead(sender, me).catch(() => {});
      }
    } else {
      // Mark all as read on the server
      if (me) {
        for (const from of unreadMapRef.current.keys()) {
          Chat.markRead(from, me).catch(() => {});
        }
      }
      unreadMapRef.current.clear();
    }
    syncUnreadState();
  }, [syncUnreadState]);

  // Send a message via REST POST
  const sendMessage = useCallback((to: string, content: string): boolean => {
    const username = myUsernameRef.current;
    if (!username) return false;
    Chat.sendMessage(username, to, content)
      .then((res) => {
        const msg = res.data as unknown as ChatMessage;
        if (msg?.id) {
          // Immediately add to local state so the sender sees their message
          // The SSE echo (if it arrives) will be deduped by the id check
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      })
      .catch((err) => {
        console.error("[chat] failed to send message:", err);
      });
    return true;
  }, [setMessages]);

  // Send a game invite via REST POST
  const sendGameInvite = useCallback((to: string, roomId: string): boolean => {
    const username = myUsernameRef.current;
    if (!username) return false;
    Chat.sendGameInvite(username, to, roomId).catch((err) => {
      console.error("[chat] failed to send game invite:", err);
    });
    return true;
  }, []);

  // Dismiss a game invite by roomId and mark as accepted on the server
  const clearGameInvite = useCallback((roomId: string) => {
    const me = myUsernameRef.current;
    if (me) {
      Chat.acceptGameInvite(me, undefined, roomId).catch(() => {});
    }
    setGameInvites((prev) => prev.filter((inv) => inv.roomId !== roomId));
  }, []);

  // Set the active chat user (keeps ref + state in sync)
  const setActiveChatUser = useCallback((username: string | null) => {
    activeChatUserRef.current = username;
    setActiveChatUserState(username);
  }, []);

  // Global SSE connection — connects when user is authenticated
  useEffect(() => {
    if (!myUsername) return;

    Chat.register(myUsername).catch(() => {});

    let destroyed = false;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let currentEventSource: EventSource | null = null;

    const connect = () => {
      if (destroyed) return;

      const eventSource = new EventSource(Chat.sseUrl(myUsername));
      currentEventSource = eventSource;

      eventSource.onopen = () => {
        console.log("[chat] SSE connected");
        setIsConnected(true);
      };

      // Handle named SSE events
      const handleEvent = (event: MessageEvent) => {
        try {
          const payload: ChatEvent = JSON.parse(event.data);

          if (payload.type === "online_users") {
            setOnlineUsers(new Set(payload.users));
          } else if (payload.type === "user_online") {
            setOnlineUsers((prev) => new Set([...prev, payload.username]));
          } else if (payload.type === "user_offline") {
            setOnlineUsers((prev) => {
              const next = new Set(prev);
              next.delete(payload.username);
              return next;
            });
          } else if (payload.type === "message") {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.id)) return prev;
              return [...prev, payload];
            });

            // Track unread: only count messages from others (not self)
            // and skip if the chat with this sender is currently open
            if (!payload.self && payload.from !== activeChatUserRef.current) {
              const from = payload.from;
              const existing = unreadMapRef.current.get(from);
              unreadMapRef.current.set(from, {
                count: (existing?.count ?? 0) + 1,
                lastMessage: payload.content,
                lastTimestamp: payload.timestamp,
              });
              syncUnreadState();
            }
          } else if (payload.type === "unread_summary") {
            // Populate unread map from server-persisted unread messages
            for (const entry of payload.entries) {
              // Skip if this chat is currently open
              if (entry.from === activeChatUserRef.current) {
                // Mark as read on server since user is already viewing this chat
                const me = myUsernameRef.current;
                if (me) {
                  Chat.markRead(entry.from, me).catch(() => {});
                }
                continue;
              }
              unreadMapRef.current.set(entry.from, {
                count: entry.count,
                lastMessage: entry.lastMessage,
                lastTimestamp: entry.lastTimestamp,
              });
            }
            syncUnreadState();
          } else if (payload.type === "game_invite") {
            // Track game invite events for rendering in chat
            setGameInviteEvents((prev) => [...prev, payload]);

            // Track as pending invite notification (only from others)
            if (!payload.self) {
              setGameInvites((prev) => {
                // Deduplicate by roomId + from
                if (prev.some((inv) => inv.roomId === payload.roomId && inv.from === payload.from)) {
                  return prev;
                }
                return [...prev, { id: payload.id, from: payload.from, roomId: payload.roomId, timestamp: payload.timestamp }];
              });
            }
          } else if (payload.type === "pending_game_invites") {
            // Restore pending game invites from DB on SSE connect
            setGameInvites((prev) => {
              const next = [...prev];
              for (const inv of payload.invites) {
                if (!next.some((existing) => existing.roomId === inv.roomId && existing.from === inv.from)) {
                  next.push({ id: inv.id, from: inv.from, roomId: inv.roomId, timestamp: inv.timestamp });
                }
              }
              return next;
            });
          }
        } catch {
          // ignore parse errors
        }
      };

      // Listen for each named event type from the SSE stream
      eventSource.addEventListener("online_users", handleEvent);
      eventSource.addEventListener("user_online", handleEvent);
      eventSource.addEventListener("user_offline", handleEvent);
      eventSource.addEventListener("message", handleEvent);
      eventSource.addEventListener("game_invite", handleEvent);
      eventSource.addEventListener("unread_summary", handleEvent);
      eventSource.addEventListener("pending_game_invites", handleEvent);

      eventSource.onerror = () => {
        console.log("[chat] SSE connection error — reconnecting...");
        setIsConnected(false);
        eventSource.close();
        if (!destroyed) {
          retryTimeout = setTimeout(connect, 2000);
        }
      };
    };

    connect();

    return () => {
      destroyed = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      currentEventSource?.close();
      currentEventSource = null;
      setIsConnected(false);
      setOnlineUsers(new Set());
    };
  }, [myUsername, syncUnreadState]);

  return (
    <ChatContext.Provider
      value={{
        onlineUsers,
        messages,
        setMessages,
        unreadCount,
        unreadEntries,
        clearUnread,
        sendMessage,
        sendGameInvite,
        gameInvites,
        clearGameInvite,
        gameInviteEvents,
        isConnected,
        activeChatUser,
        setActiveChatUser,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
