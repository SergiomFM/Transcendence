"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/auth-provider";
import { useChat } from "@/components/providers/chat-provider";
import { Friends as FriendsApi } from "@/lib/backend/friends";
import type { Friend } from "@/lib/backend/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Circle, Send, Check, Gamepad2 } from "lucide-react";

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const resolveAvatar = (obj: { avatar?: string | null; avatar_url?: string | null }) =>
  obj.avatar || obj.avatar_url || null;

interface FriendInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
}

export function FriendInviteModal({ open, onOpenChange, roomId }: FriendInviteModalProps) {
  const t = useTranslations();
  const { isAuthenticated } = useAuth();
  const { onlineUsers, sendGameInvite } = useChat();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !isAuthenticated) return;
    setLoading(true);
    FriendsApi.list()
      .then((res) => setFriends(res.data.friends))
      .catch(() => setFriends([]))
      .finally(() => setLoading(false));
  }, [open, isAuthenticated]);

  // Reset sent state when modal opens
  useEffect(() => {
    if (open) setSentTo(new Set());
  }, [open]);

  const handleInvite = (friend: Friend) => {
    const success = sendGameInvite(friend.display_name, roomId);
    if (success) {
      setSentTo((prev) => new Set([...prev, friend.display_name]));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-neon" />
            {t("game.inviteFriend")}
          </DialogTitle>
          <DialogDescription>
            {t("game.inviteFriendDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 overflow-y-auto space-y-1">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("common.loading")}
            </p>
          ) : !isAuthenticated ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("game.inviteLoginRequired")}
            </p>
          ) : friends.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("friends.noFriends")}
            </p>
          ) : (
            friends.map((friend) => {
              const isOnline = onlineUsers.has(friend.display_name);
              const wasSent = sentTo.has(friend.display_name);
              return (
                <div
                  key={friend.user_id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="relative shrink-0">
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
                    <Circle
                      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 fill-current ${
                        isOnline ? "text-green-500" : "text-muted-foreground/40"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{friend.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {isOnline ? t("chat.online") : t("chat.offline")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={wasSent ? "ghost" : "outline"}
                    disabled={wasSent}
                    onClick={() => handleInvite(friend)}
                    className="shrink-0"
                  >
                    {wasSent ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1" />
                        {t("game.inviteSent")}
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 mr-1" />
                        {t("game.invite")}
                      </>
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
