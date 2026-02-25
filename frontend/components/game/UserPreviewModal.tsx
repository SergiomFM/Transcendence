"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/auth-provider";
import { Players } from "@/lib/backend/players";
import { Friends } from "@/lib/backend/friends";
import type { PlayerProfile } from "@/lib/backend/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, UserPlus, Check, Loader2, X } from "lucide-react";

type FriendStatus = "none" | "friends" | "pending_sent" | "loading";

interface UserPreviewModalProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserPreviewModal({ userId, open, onOpenChange }: UserPreviewModalProps) {
  const t = useTranslations();
  const { user: currentUser, isAuthenticated } = useAuth();

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>("loading");
  const [friendActionLoading, setFriendActionLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    let active = true;

    setLoading(true);
    setProfile(null);
    setFriendStatus("loading");

    const fetchData = async () => {
      try {
        const profileRes = await Players.getByUserId(userId);
        if (active) setProfile(profileRes.data);
      } catch {
        if (active) setProfile(null);
      } finally {
        if (active) setLoading(false);
      }

      if (!isAuthenticated || currentUser?.id === userId) {
        if (active) setFriendStatus("none");
        return;
      }

      try {
        const [friendsRes, sentRes] = await Promise.all([
          Friends.list(),
          Friends.listSentRequests(),
        ]);

        if (!active) return;

        if (friendsRes.data.friends.some((f) => f.user_id === userId)) {
          setFriendStatus("friends");
        } else if (sentRes.data.requests.some((r) => r.receiver_id === userId)) {
          setFriendStatus("pending_sent");
        } else {
          setFriendStatus("none");
        }
      } catch {
        if (active) setFriendStatus("none");
      }
    };

    fetchData();
    return () => { active = false; };
  }, [open, userId, isAuthenticated, currentUser?.id]);

  const handleAddFriend = async () => {
    if (!userId) return;
    setFriendActionLoading(true);
    try {
      await Friends.sendRequest(userId);
      setFriendStatus("pending_sent");
    } catch {
      // silently fail
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!userId) return;
    setFriendActionLoading(true);
    try {
      await Friends.cancelRequest(userId);
      setFriendStatus("none");
    } catch {
      // silently fail
    } finally {
      setFriendActionLoading(false);
    }
  };

  const resolveAvatar = (p: PlayerProfile) => p.avatar || p.avatar_url || null;

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs" aria-describedby={undefined}>
        <DialogTitle className="sr-only">
          {profile?.display_name ?? t("common.loading")}
        </DialogTitle>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !profile ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">{t("profile.notFound")}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-2">
            <Avatar className="h-20 w-20">
              {resolveAvatar(profile) && (
                <AvatarImage src={resolveAvatar(profile)!} alt={profile.display_name} />
              )}
              <AvatarFallback className="text-lg bg-muted/80">
                {getInitials(profile.display_name)}
              </AvatarFallback>
            </Avatar>

            <h2 className="text-lg font-semibold text-foreground truncate max-w-full">
              {profile.display_name}
            </h2>

            {isAuthenticated && currentUser?.id !== userId && (
              <>
                {friendStatus === "loading" ? (
                  <Button size="sm" disabled>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    {t("common.loading")}
                  </Button>
                ) : friendStatus === "friends" ? (
                  <Button size="sm" variant="outline" disabled>
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                    {t("friends.alreadyFriends")}
                  </Button>
                ) : friendStatus === "pending_sent" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelRequest}
                    disabled={friendActionLoading}
                  >
                    {friendActionLoading ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {t("friends.cancelRequest")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleAddFriend}
                    disabled={friendActionLoading}
                  >
                    {friendActionLoading ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {t("friends.addFriend")}
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
