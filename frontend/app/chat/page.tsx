"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Send, MessageSquare, ArrowLeft, Circle, Gamepad2, Bell } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useChat } from "@/components/providers/chat-provider";
import { Friends } from "@/lib/backend/friends";
import { Chat, type ChatMessage } from "@/lib/backend/chat";
import type { GameInviteEvent } from "@/lib/backend/chat";
import type { Friend } from "@/lib/backend/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { GAME_BACKEND_URL } from "@/lib/backend/config";

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const resolveAvatar = (obj: { avatar?: string | null; avatar_url?: string | null }) =>
  obj.avatar || obj.avatar_url || null;

export default function ChatPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    onlineUsers,
    messages,
    setMessages,
    clearUnread,
    sendMessage: wsSendMessage,
    sendGameInvite,
    gameInviteEvents,
    unreadEntries,
    setActiveChatUser,
    clearGameInvite,
    gameInvites,
  } = useChat();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [input, setInput] = useState("");
  const [activeFriend, setActiveFriend] = useState<Friend | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [invitingGame, setInvitingGame] = useState(false);

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

  // ── Clear unread and tell the provider which chat is active ─────────────
  useEffect(() => {
    if (activeFriend) {
      clearUnread(activeFriend.display_name);
      setActiveChatUser(activeFriend.display_name);
    } else {
      setActiveChatUser(null);
    }
    return () => {
      setActiveChatUser(null);
    };
  }, [activeFriend, clearUnread, setActiveChatUser]);

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
  }, [activeFriend, user, router, setMessages]);

  // ── send message ───────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const content = input.trim();
    if (!content || !activeFriend) return;

    const success = wsSendMessage(activeFriend.display_name, content);
    if (success) setInput("");
  }, [input, activeFriend, wsSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  // ── invite friend to a new game room ───────────────────────────────────────
  const handleInviteToGame = useCallback(async () => {
    if (!activeFriend || invitingGame) return;
    setInvitingGame(true);
    try {
      const response = await fetch(`${GAME_BACKEND_URL}/pong/rooms`, {
        method: "POST",
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data?.id) {
        sendGameInvite(activeFriend.display_name, data.id);
        // Navigate to the room
        router.push(`/pong?room=${encodeURIComponent(data.id)}`);
      }
    } catch {
      // silently fail
    } finally {
      setInvitingGame(false);
    }
  }, [activeFriend, invitingGame, sendGameInvite, router]);

  // ── go back to friend list (mobile) ────────────────────────────────────────
  const handleBack = () => {
    setActiveFriend(null);
    router.replace("/chat", { scroll: false });
  };

  // ── Filter messages for the active conversation ───────────────────────────
  const myUsername = user ? (user.alias || user.username) : "";
  const conversationMessages = activeFriend
    ? messages.filter(
        (msg) =>
          (msg.from === myUsername && msg.to === activeFriend.display_name) ||
          (msg.from === activeFriend.display_name && msg.to === myUsername),
      )
    : [];

  // ── Merge game invites into conversation timeline ─────────────────────────
  const conversationInvites = activeFriend
    ? gameInviteEvents.filter(
        (inv) =>
          (inv.from === myUsername && inv.to === activeFriend.display_name) ||
          (inv.from === activeFriend.display_name && inv.to === myUsername),
      )
    : [];

  type TimelineItem =
    | { kind: "message"; data: ChatMessage }
    | { kind: "invite"; data: GameInviteEvent };

  const timeline: TimelineItem[] = [
    ...conversationMessages.map((m) => ({ kind: "message" as const, data: m })),
    ...conversationInvites.map((inv) => ({ kind: "invite" as const, data: inv })),
  ].sort(
    (a, b) => new Date(a.data.timestamp).getTime() - new Date(b.data.timestamp).getTime(),
  );

  // ── auth guard ─────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4">
        <Card className="w-full max-w-md p-6 text-center">
          <p className="text-muted-foreground">{t("chat.notAuthenticated")}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 h-0 overflow-hidden">
      {/* ── sidebar: friend list ──
           Mobile: full-width, hidden when a conversation is open
           Desktop: fixed 16rem sidebar, always visible */}
      <aside
        className={`${
          activeFriend ? "hidden" : "flex"
        } md:flex w-full md:w-64 shrink-0 border-r border-border/50 flex-col`}
      >
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
              const unread = unreadEntries.find((e) => e.from === friend.display_name);
              const friendInvites = gameInvites.filter((inv) => inv.from === friend.display_name);
              const msgCount = unread?.count ?? 0;
              const invCount = friendInvites.length;
              const totalBadge = msgCount + invCount;
              return (
                <button
                  key={friend.user_id}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors ${isActive ? "bg-muted" : ""}`}
                  onClick={() => setActiveFriend(friend)}
                >
                  <div className="relative shrink-0">
                    <Link
                      href={`/users/${friend.user_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="block hover:opacity-80 transition-opacity"
                    >
                      <Avatar className="h-8 w-8">
                        {resolveAvatar(friend) && (
                          <AvatarImage
                            src={resolveAvatar(friend)!}
                            alt={friend.display_name}
                          />
                        )}
                        <AvatarFallback className="text-xs">
                          {getInitials(friend.display_name)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <Circle
                      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 fill-current ${isOnline ? "text-green-500" : "text-muted-foreground/40"}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">
                        {friend.display_name}
                      </p>
                      {totalBadge > 0 && (
                        <span className="shrink-0 flex items-center gap-1 rounded-full bg-neon px-1.5 py-0.5 animate-pulse-glow">
                          {invCount > 0 ? (
                            <Gamepad2 className="h-2.5 w-2.5 text-background" />
                          ) : (
                            <Bell className="h-2.5 w-2.5 text-background" />
                          )}
                          <span className="text-[10px] font-bold text-background leading-none">
                            {totalBadge > 99 ? "99+" : totalBadge}
                          </span>
                        </span>
                      )}
                    </div>
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

      {/* ── main: conversation ──
           Mobile: full-width, hidden when no conversation is open
           Desktop: fills remaining space, always visible */}
      <div
        className={`${
          activeFriend ? "flex" : "hidden"
        } md:flex flex-1 flex-col min-w-0`}
      >
        {activeFriend ? (
          <>
            {/* header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 shrink-0">
              <button
                onClick={handleBack}
                className="md:hidden text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <Link
                href={`/users/${activeFriend.user_id}`}
                className="relative hover:opacity-80 transition-opacity"
              >
                <Avatar className="h-8 w-8">
                  {resolveAvatar(activeFriend) && (
                    <AvatarImage
                      src={resolveAvatar(activeFriend)!}
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
              </Link>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">
                  {activeFriend.display_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {onlineUsers.has(activeFriend.display_name)
                    ? t("chat.online")
                    : t("chat.offline")}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 text-xs gap-1.5"
                onClick={handleInviteToGame}
                disabled={invitingGame || !onlineUsers.has(activeFriend.display_name)}
                title={t("game.inviteToGame")}
              >
                <Gamepad2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("game.inviteToGame")}</span>
              </Button>
            </div>

            {/* messages */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-2">
              {loadingHistory ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {t("common.loading")}
                </p>
              ) : timeline.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {t("chat.noMessages")}
                </p>
              ) : (
                timeline.map((item, i) => {
                  if (item.kind === "invite") {
                    const inv = item.data;
                    const isSelf = inv.from === myUsername;
                    return (
                      <div
                        key={`inv-${inv.roomId}-${inv.timestamp}`}
                        className={`flex ${isSelf ? "justify-end" : "justify-start"}`}
                      >
                        <button
                          onClick={() => {
                            clearGameInvite(inv.roomId);
                            router.push(`/pong?room=${encodeURIComponent(inv.roomId)}`);
                          }}
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 py-2 text-sm break-words cursor-pointer transition-colors ${
                            isSelf
                              ? "bg-neon/10 border border-neon/40 hover:bg-neon/20 rounded-br-sm"
                              : "bg-neon/10 border border-neon/40 hover:bg-neon/20 rounded-bl-sm"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Gamepad2 className="h-4 w-4 text-neon shrink-0" />
                            <span className="font-medium text-neon">
                              {isSelf
                                ? t("game.inviteSentLabel")
                                : t("game.inviteReceivedLabel")}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("game.clickToJoinRoom")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 text-right">
                            {new Date(inv.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </button>
                      </div>
                    );
                  }

                  const msg = item.data;
                  const isSelf = msg.from === myUsername;
                  return (
                    <div
                      key={msg.id ?? i}
                      className={`flex ${isSelf ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 py-2 text-sm break-words ${
                          isSelf
                            ? "bg-neon/20 border border-neon/30 text-foreground rounded-br-sm"
                            : "bg-muted border border-border/50 text-foreground rounded-bl-sm"
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 text-right">
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
            <div className="px-3 sm:px-4 py-3 border-t border-border/50 shrink-0 flex gap-2">
              <Input
                ref={inputRef}
                name="chat-message"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("chat.inputPlaceholder")}
                className="flex-1"
                autoComplete="off"
                autoCorrect="off"
                data-form-type="other"
              />
              <Button
                size="icon"
                onClick={handleSend}
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
