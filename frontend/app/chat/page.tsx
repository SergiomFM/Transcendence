"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Send, MessageSquare, ArrowLeft, Circle } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Friends } from "@/lib/backend/friends";
import { Chat, type ChatMessage, type ChatEvent } from "@/lib/backend/chat";
import type { Friend } from "@/lib/backend/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

export default function ChatPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [activeFriend, setActiveFriend] = useState<Friend | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── scroll to bottom ───────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── load friends ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    Friends.list()
      .then((res) => setFriends(res.data.friends))
      .catch(() => setFriends([]));
  }, [isAuthenticated]);

  // ── pick active friend from ?with= param ──────────────────────────────────
  useEffect(() => {
    if (!friends.length) return;
    const withParam = searchParams.get("with");
    if (withParam) {
      const found = friends.find(
        (f) => f.display_name === withParam || f.user_id === withParam,
      );
      if (found) setActiveFriend(found);
    }
  }, [friends, searchParams]);

  // ── WebSocket connection with auto-reconnect ──────────────────────────────
  useEffect(() => {
    if (!user) return;

    const myUsername = user.alias || user.username;
    Chat.register(myUsername).catch(() => {});

    let destroyed = false;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (destroyed) return;

      const ws = new WebSocket(Chat.wsUrl(myUsername));
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[chat] ws connected");
      };

      ws.onmessage = (event) => {
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
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        console.log("[chat] ws disconnected — retrying in 2s");
        if (!destroyed) {
          retryTimeout = setTimeout(connect, 2000);
        }
      };
    };

    connect();

    return () => {
      destroyed = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      wsRef.current?.close();
    };
  }, [user]);

  // ── load history when active friend changes ────────────────────────────────
  useEffect(() => {
    if (!activeFriend || !user) return;

    const myUsername = user.alias || user.username;
    const theirUsername = activeFriend.display_name;

    setMessages([]);
    setLoadingHistory(true);

    Chat.getMessages(myUsername, theirUsername)
      .then((res) => {
        // API returns raw Message objects; shape them into ChatMessage
        const shaped: ChatMessage[] = (res.data as unknown as Array<{
          id: number;
          content: string;
          senderId: number;
          receiverId: number;
          createdAt: string;
          sender: { username: string };
          receiver: { username: string };
        }>).map((m) => ({
          id: m.id,
          type: "message" as const,
          from: m.sender.username,
          to: m.receiver.username,
          content: m.content,
          timestamp: m.createdAt,
          self: m.sender.username === myUsername,
        }));
        setMessages(shaped);
      })
      .catch(() => setMessages([]))
      .finally(() => setLoadingHistory(false));

    // Update URL
    router.replace(`/chat?with=${encodeURIComponent(theirUsername)}`, {
      scroll: false,
    });
    inputRef.current?.focus();
  }, [activeFriend, user, router]);

  // ── send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(() => {
    const content = input.trim();
    if (!content || !activeFriend || !wsRef.current) return;
    if (wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(
      JSON.stringify({
        type: "message",
        to: activeFriend.display_name,
        content,
      }),
    );
    setInput("");
  }, [input, activeFriend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") sendMessage();
  };

  // ── auth guard ─────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <Card className="w-full max-w-md p-6 text-center">
          <p className="text-muted-foreground">{t("chat.notAuthenticated")}</p>
        </Card>
      </div>
    );
  }

  const myUsername = user.alias || user.username;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* ── sidebar: friend list ── */}
      <aside className="w-64 shrink-0 border-r border-border/50 flex flex-col">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <MessageSquare className="h-4 w-4 text-neon" />
          <span className="font-semibold text-sm">{t("chat.title")}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {friends.length === 0 ? (
            <p className="text-xs text-muted-foreground px-4 py-6 text-center">
              {t("chat.noFriends")}
            </p>
          ) : (
            friends.map((friend) => {
              const isOnline = onlineUsers.has(friend.display_name);
              const isActive = activeFriend?.user_id === friend.user_id;
              return (
                <button
                  key={friend.user_id}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors ${isActive ? "bg-muted" : ""}`}
                  onClick={() => setActiveFriend(friend)}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-8 w-8">
                      {friend.avatar_url && (
                        <AvatarImage
                          src={friend.avatar_url}
                          alt={friend.display_name}
                        />
                      )}
                      <AvatarFallback className="text-xs">
                        {getInitials(friend.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <Circle
                      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 fill-current ${isOnline ? "text-green-500" : "text-muted-foreground/40"}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {friend.display_name}
                    </p>
                    {isOnline && (
                      <p className="text-xs text-green-500">{t("chat.online")}</p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ── main: conversation ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeFriend ? (
          <>
            {/* header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 shrink-0">
              <Link
                href="/friends"
                className="md:hidden text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div className="relative">
                <Avatar className="h-8 w-8">
                  {activeFriend.avatar_url && (
                    <AvatarImage
                      src={activeFriend.avatar_url}
                      alt={activeFriend.display_name}
                    />
                  )}
                  <AvatarFallback className="text-xs">
                    {getInitials(activeFriend.display_name)}
                  </AvatarFallback>
                </Avatar>
                <Circle
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 fill-current ${onlineUsers.has(activeFriend.display_name) ? "text-green-500" : "text-muted-foreground/40"}`}
                />
              </div>
              <div>
                <p className="font-semibold text-sm">
                  {activeFriend.display_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {onlineUsers.has(activeFriend.display_name)
                    ? t("chat.online")
                    : t("chat.offline")}
                </p>
              </div>
            </div>

            {/* messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {loadingHistory ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {t("common.loading")}
                </p>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {t("chat.noMessages")}
                </p>
              ) : (
                messages.map((msg, i) => {
                  const isSelf = msg.from === myUsername;
                  return (
                    <div
                      key={msg.id ?? i}
                      className={`flex ${isSelf ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm break-words ${
                          isSelf
                            ? "bg-neon/20 border border-neon/30 text-foreground rounded-br-sm"
                            : "bg-muted border border-border/50 text-foreground rounded-bl-sm"
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 text-right">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* input */}
            <div className="px-4 py-3 border-t border-border/50 shrink-0 flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("chat.inputPlaceholder")}
                className="flex-1"
                autoComplete="off"
              />
              <Button
                size="icon"
                onClick={sendMessage}
                disabled={!input.trim()}
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <MessageSquare className="h-10 w-10 mx-auto opacity-30" />
              <p className="text-sm">{t("chat.selectFriend")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
