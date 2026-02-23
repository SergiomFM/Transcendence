"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { GAME_BACKEND_URL } from "@/lib/backend/config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Gamepad2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoomUser {
  id: string | null;
  name: string | null;
  avatar: string | null;
  role: "player" | "spectator";
  playerSlot: number | null;
}

interface ConnectedPlayersProps {
  roomId: string;
  hidden?: boolean;
  className?: string;
}

export function ConnectedPlayers({ roomId, hidden, className }: ConnectedPlayersProps) {
  const t = useTranslations("game");
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchUsers = async () => {
      try {
        const response = await fetch(
          `${GAME_BACKEND_URL}/pong/rooms/${encodeURIComponent(roomId)}/users`
        );
        if (!response.ok) return;
        const data = await response.json();
        if (active) setUsers(data);
      } catch {
        // silently ignore fetch errors
      }
    };

    fetchUsers();
    const interval = setInterval(fetchUsers, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [roomId]);

  const players = users.filter((u) => u.role === "player");
  const spectators = users.filter((u) => u.role === "spectator");

  if (users.length === 0 || hidden) return null;

  return (
    <div
      className={cn(
        "absolute bottom-4 left-4 z-50 select-none",
        className
      )}
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2 px-3 py-1.5 mb-1.5 text-xs font-bold uppercase tracking-wider text-neon/80 hover:text-neon bg-black/60 border border-neon-muted/30 hover:border-neon-muted/60 pixel-corners-sm transition-colors cursor-pointer"
      >
        <span>{t("connectedPlayers")}</span>
        <span className="text-neon/60">{users.length}</span>
        <span
          className={cn(
            "inline-block text-[10px] transition-transform",
            collapsed ? "rotate-180" : ""
          )}
        >
          ▼
        </span>
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto scrollbar-thin">
          {players.map((user, i) => (
            <PlayerEntry key={`p-${user.id || i}`} user={user} t={t} />
          ))}
          {spectators.map((user, i) => (
            <PlayerEntry key={`s-${user.id || i}`} user={user} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerEntry({
  user,
  t,
}: {
  user: RoomUser;
  t: ReturnType<typeof useTranslations>;
}) {
  const isPlayer = user.role === "player";
  const displayName =
    user.name || (isPlayer ? `${t("player")} ${user.playerSlot}` : t("spectator"));

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-1.5 bg-black/60 border pixel-corners-sm",
        isPlayer
          ? "border-neon-muted/40"
          : "border-muted-foreground/20"
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        {user.avatar ? (
          <AvatarImage src={user.avatar} alt={displayName} />
        ) : null}
        <AvatarFallback className="text-xs bg-muted/80">
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <span
        className={cn(
          "text-sm truncate max-w-[120px]",
          isPlayer ? "text-neon/90" : "text-muted-foreground"
        )}
      >
        {displayName}
      </span>
      {isPlayer ? (
        <Gamepad2 className="h-4 w-4 shrink-0 text-neon/50" />
      ) : (
        <Eye className="h-4 w-4 shrink-0 text-muted-foreground/50" />
      )}
    </div>
  );
}
