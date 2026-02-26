"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, Gamepad2, Eye, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { FriendInviteModal } from "./FriendInviteModal";
import { UserPreviewModal } from "./UserPreviewModal";
import type { RoomUser } from "./types";

interface ConnectedPlayersProps {
  roomId: string;
  hidden?: boolean;
  className?: string;
  users?: RoomUser[];
}

export function ConnectedPlayers({ roomId, hidden, className, users = [] }: ConnectedPlayersProps) {
  const t = useTranslations("game");
  const { isAuthenticated, user: currentUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);

  const players = users.filter((u) => u.role === "player");
  const spectators = users.filter((u) => u.role === "spectator");

  if (hidden) return null;

  return (
    <div
      className={cn(
        "absolute bottom-4 left-4 z-50 select-none",
        className
      )}
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        onMouseDown={(e) => e.preventDefault()}
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
          {users.length === 0 ? (
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-black/60 border border-neon-muted/30 pixel-corners-sm">
              <User className="h-4 w-4 text-muted-foreground/50" />
              <span className="text-xs text-muted-foreground">{t("waitingForPlayers")}</span>
            </div>
          ) : (
            <>
              {players.map((user, i) => (
                <PlayerEntry key={`p-${user.id || i}`} user={user} t={t} currentUserId={currentUser?.id} onClickUser={setPreviewUserId} />
              ))}
              {spectators.map((user, i) => (
                <PlayerEntry key={`s-${user.id || i}`} user={user} t={t} currentUserId={currentUser?.id} onClickUser={setPreviewUserId} />
              ))}
            </>
          )}
        </div>
      )}

      {isAuthenticated && (
        <>
          <Button
             size="sm"
             variant="ghost"
             className="mt-1.5 w-full text-xs text-neon/70 hover:text-neon bg-black/60 border border-neon-muted/30 hover:border-neon-muted/60 pixel-corners-sm"
             onClick={() => setInviteOpen(true)}
             onMouseDown={(e) => e.preventDefault()}
           >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            {t("inviteFriend")}
          </Button>
          <FriendInviteModal
            open={inviteOpen}
            onOpenChange={setInviteOpen}
            roomId={roomId}
          />
        </>
      )}

      <UserPreviewModal
        userId={previewUserId}
        open={!!previewUserId}
        onOpenChange={(open) => { if (!open) setPreviewUserId(null); }}
      />
    </div>
  );
}

function PlayerEntry({
  user,
  t,
  currentUserId,
  onClickUser,
}: {
  user: RoomUser;
  t: ReturnType<typeof useTranslations>;
  currentUserId?: string;
  onClickUser: (userId: string) => void;
}) {
  const isPlayer = user.role === "player";
  const isSelf = !!(currentUserId && user.id === currentUserId);
  const displayName =
    user.name || (isPlayer ? `${t("player")} ${user.playerSlot}` : t("spectator"));
  const isClickable = !!(user.id && !isSelf);

  const avatarAndName = (
    <>
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
    </>
  );

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-1.5 bg-black/60 border pixel-corners-sm",
        isPlayer
          ? "border-neon-muted/40"
          : "border-muted-foreground/20"
      )}
    >
      {isClickable ? (
        <button
          onClick={() => onClickUser(user.id!)}
          className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity cursor-pointer"
        >
          {avatarAndName}
        </button>
      ) : (
        <div className="flex items-center gap-2.5 min-w-0">
          {avatarAndName}
        </div>
      )}
      {isPlayer ? (
        <Gamepad2 className="h-4 w-4 shrink-0 text-neon/50" />
      ) : (
        <Eye className="h-4 w-4 shrink-0 text-muted-foreground/50" />
      )}
    </div>
  );
}
