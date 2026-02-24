"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { GAME_BACKEND_URL } from "@/lib/backend/config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Gamepad2, Eye, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "./types";

interface RoomChatProps {
  roomId: string;
  hidden?: boolean;
  className?: string;
  messages: ChatMessage[];
  onSend?: (content: string) => void;
}

export function RoomChat({
  roomId,
  hidden,
  className,
  messages,
  onSend,
}: RoomChatProps) {
  const t = useTranslations("game");
  // Start expanded on mobile, collapsed on desktop
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 768;
  });
  const [input, setInput] = useState("");
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(messages.length);

  // Track unread messages when collapsed
  useEffect(() => {
    if (collapsed && messages.length > prevMessageCount.current) {
      setUnread((u) => u + (messages.length - prevMessageCount.current));
    }
    prevMessageCount.current = messages.length;
  }, [messages.length, collapsed]);

  // Clear unread when expanded
  useEffect(() => {
    if (!collapsed) {
      setUnread(0);
    }
  }, [collapsed]);

  // Auto-scroll to bottom when new messages arrive and panel is open
  // Use "instant" when expanding (collapsed just changed) so it starts at the bottom,
  // and "smooth" when a new message arrives while already open.
  const wasCollapsed = useRef(collapsed);
  useEffect(() => {
    if (!collapsed && messagesEndRef.current) {
      const justExpanded = wasCollapsed.current;
      messagesEndRef.current.scrollIntoView({
        behavior: justExpanded ? "instant" : "smooth",
      });
    }
    wasCollapsed.current = collapsed;
  }, [messages.length, collapsed]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !onSend) return;
    onSend(text);
    setInput("");
  }, [input, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        handleSend();
      }
    },
    [handleSend],
  );

  if (hidden) return null;

  return (
    <div className={cn("absolute bottom-4 right-4 z-50 select-none flex flex-col items-end overflow-hidden", className)}>
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2 px-3 py-1.5 mb-1.5 text-xs font-bold uppercase tracking-wider text-neon/80 hover:text-neon bg-black/60 border border-neon-muted/30 hover:border-neon-muted/60 pixel-corners-sm transition-colors cursor-pointer shrink-0"
      >
        <span>{t("roomChat")}</span>
        {unread > 0 && (
          <span className="text-neon/60">{unread > 99 ? "99+" : unread}</span>
        )}
        <span
          className={cn(
            "inline-block text-[10px] transition-transform",
            collapsed ? "" : "rotate-180",
          )}
        >
          &#9660;
        </span>
      </button>

      {!collapsed && (
        <div className="flex flex-col bg-black/60 border border-neon-muted/30 pixel-corners-sm overflow-hidden w-full sm:w-96 min-h-0 flex-1 max-h-full">
          {/* Messages area — tall on desktop, flexible on mobile */}
          <div className="flex flex-col gap-1.5 p-2.5 min-h-0 flex-1 overflow-y-auto scrollbar-thin sm:max-h-96">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground/50 text-center py-4">
                {t("noMessages")}
              </p>
            )}
            {messages.map((msg) => (
              <ChatEntry key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="flex items-center gap-2 border-t border-neon-muted/20 p-2">
            <input
              type="text"
              name="chat-message"
              autoComplete="off"
              autoCorrect="off"
              data-form-type="other"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("chatPlaceholder")}
              maxLength={200}
              className="flex-1 text-sm bg-black/40 border border-neon-muted/20 text-foreground placeholder:text-muted-foreground/40 px-2.5 py-1.5 rounded-sm outline-none focus:border-neon-muted/50 min-w-0"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-1.5 text-neon/60 hover:text-neon disabled:text-muted-foreground/30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChatEntry({ message }: { message: ChatMessage }) {
  const isPlayer = message.role === "player";

  return (
    <div className="flex items-start gap-2 px-1">
      <Avatar className="h-6 w-6 shrink-0 mt-0.5">
        {message.avatar ? (
          <AvatarImage src={message.avatar} alt={message.name} />
        ) : null}
        <AvatarFallback className="text-[10px] bg-muted/80">
          <User className="h-3 w-3" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "text-xs font-semibold truncate max-w-[140px]",
              isPlayer ? "text-neon/90" : "text-muted-foreground",
            )}
          >
            {message.name}
          </span>
          {isPlayer ? (
            <Gamepad2 className="h-3 w-3 shrink-0 text-neon/40" />
          ) : (
            <Eye className="h-3 w-3 shrink-0 text-muted-foreground/40" />
          )}
        </div>
        <p className="text-sm text-foreground/80 break-words leading-snug">
          {message.content}
        </p>
      </div>
    </div>
  );
}
