"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Settings, UserPlus, UserCheck, UserX, Loader2, X, Swords } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Players } from "@/lib/backend/players";
import { Friends } from "@/lib/backend/friends";
import { isRequestError } from "@/lib/backend";
import type { MatchRecord, PlayerProfile } from "@/lib/backend/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FriendStatus = "none" | "friends" | "pending_sent" | "loading";

const UserProfilePage = () => {
  const t = useTranslations();
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser, isAuthenticated } = useAuth();

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>("loading");
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [friendActionError, setFriendActionError] = useState("");
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError("");
      try {
        const res = await Players.getByUserId(userId);
        setProfile(res.data);
      } catch (err) {
        if (isRequestError(err) && err.status === 404) {
          setError(t("profile.notFound"));
        } else {
          setError(t("common.error"));
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) fetchProfile();
  }, [userId, t]);

  useEffect(() => {
    const fetchMatches = async () => {
      setMatchesLoading(true);
      try {
        const res = await Players.getMatchHistory(userId);
        setMatches(res.data.matches);
      } catch {
        setMatches([]);
      } finally {
        setMatchesLoading(false);
      }
    };

    if (userId) fetchMatches();
  }, [userId]);

  useEffect(() => {
    if (!isAuthenticated || isOwnProfile) {
      setFriendStatus("none");
      return;
    }

    const checkFriendship = async () => {
      setFriendStatus("loading");
      try {
        const [friendsRes, sentRes] = await Promise.all([
          Friends.list(),
          Friends.listSentRequests(),
        ]);

        if (friendsRes.data.friends.some((f) => f.user_id === userId)) {
          setFriendStatus("friends");
          return;
        }

        if (sentRes.data.requests.some((r) => r.receiver_id === userId)) {
          setFriendStatus("pending_sent");
          return;
        }

        setFriendStatus("none");
      } catch {
        setFriendStatus("none");
      }
    };

    checkFriendship();
  }, [userId, isAuthenticated, isOwnProfile]);

  const handleSendRequest = async () => {
    setFriendActionLoading(true);
    setFriendActionError("");
    try {
      await Friends.sendRequest(userId);
      setFriendStatus("pending_sent");
    } catch (err) {
      if (isRequestError(err)) {
        const data = err.data as { error?: string } | undefined;
        setFriendActionError(data?.error ?? t("common.error"));
      } else {
        setFriendActionError(t("common.error"));
      }
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    setFriendActionLoading(true);
    setFriendActionError("");
    try {
      await Friends.remove(userId);
      setFriendStatus("none");
    } catch (err) {
      if (isRequestError(err)) {
        const data = err.data as { error?: string } | undefined;
        setFriendActionError(data?.error ?? t("common.error"));
      } else {
        setFriendActionError(t("common.error"));
      }
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    setFriendActionLoading(true);
    setFriendActionError("");
    try {
      await Friends.cancelRequest(userId);
      setFriendStatus("none");
    } catch (err) {
      if (isRequestError(err)) {
        const data = err.data as { error?: string } | undefined;
        setFriendActionError(data?.error ?? t("common.error"));
      } else {
        setFriendActionError(t("common.error"));
      }
    } finally {
      setFriendActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <p className="text-destructive">{error || t("profile.notFound")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const avatarUrl = isOwnProfile ? currentUser?.avatar : (profile.avatar || profile.avatar_url);
  const initials = profile.display_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const renderFriendButton = () => {
    if (!isAuthenticated || isOwnProfile) return null;

    if (friendStatus === "loading") {
      return (
        <Button variant="outline" size="sm" disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t("common.loading")}
        </Button>
      );
    }

    if (friendStatus === "friends") {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRemoveFriend}
          disabled={friendActionLoading}
          className="border-neon-muted/50 text-muted-foreground hover:border-destructive hover:text-destructive"
        >
          {friendActionLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UserX className="mr-2 h-4 w-4" />
          )}
          {t("friends.removeFriend")}
        </Button>
      );
    }

    if (friendStatus === "pending_sent") {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancelRequest}
          disabled={friendActionLoading}
          className="border-neon-muted/50 text-muted-foreground hover:border-destructive hover:text-destructive"
        >
          {friendActionLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <X className="mr-2 h-4 w-4" />
          )}
          {t("friends.cancelRequest")}
        </Button>
      );
    }

    // none
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleSendRequest}
        disabled={friendActionLoading}
        className="border-neon/50 hover:border-neon hover:text-neon"
      >
        {friendActionLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="mr-2 h-4 w-4" />
        )}
        {t("friends.addFriend")}
      </Button>
    );
  };

  const renderMatchRow = (match: MatchRecord) => {
    const isPlayer1 = match.player1_id === userId;
    const myScore = isPlayer1 ? match.player1_score : match.player2_score;
    const opponentScore = isPlayer1 ? match.player2_score : match.player1_score;
    const opponentName = isPlayer1
      ? (match.player2_display_name ?? t("profile.guest"))
      : (match.player1_display_name ?? t("profile.guest"));
    const opponentId = isPlayer1 ? match.player2_id : match.player1_id;
    const opponentAvatarUrl = isPlayer1
      ? (match.player2_avatar || match.player2_avatar_url)
      : (match.player1_avatar || match.player1_avatar_url);
    const opponentInitials = opponentName
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const won = match.winner_id === userId;
    const lost = match.winner_id !== null && match.winner_id !== userId;

    const resultLabel = won
      ? t("profile.matchWon")
      : lost
      ? t("profile.matchLost")
      : t("profile.matchDraw");

    const resultColor = won
      ? "text-neon"
      : lost
      ? "text-destructive"
      : "text-muted-foreground";

    return (
      <div
        key={match.id}
        className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        {/* Opponent */}
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-8 w-8 shrink-0">
            {opponentAvatarUrl ? (
              <AvatarImage src={opponentAvatarUrl} alt={opponentName} />
            ) : null}
            <AvatarFallback className="text-xs">{opponentInitials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            {opponentId ? (
              <Link
                href={`/users/${opponentId}`}
                className="text-sm font-medium truncate hover:text-neon transition-colors block"
              >
                {opponentName}
              </Link>
            ) : (
              <span className="text-sm font-medium text-muted-foreground truncate block">
                {opponentName}
              </span>
            )}
            <p className="text-xs text-muted-foreground">
              {new Date(match.played_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Score + result */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-mono font-semibold tabular-nums">
            {myScore} – {opponentScore}
          </span>
          <span className={`text-xs font-semibold w-12 text-right ${resultColor}`}>
            {resultLabel}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-start justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-2xl space-y-6 animate-fade-up">
        <Card className="border-glow">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
              <Avatar className="h-20 w-20 shrink-0 ring-2 ring-neon-muted shadow-[0_0_20px_var(--neon-muted)]">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={profile.display_name} />
                ) : null}
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-center sm:text-left w-full">
                <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold truncate text-glow">
                      {profile.display_name}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {t("profile.memberSince")}{" "}
                      {new Date(profile.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {renderFriendButton()}
                    {isOwnProfile && (
                      <Link href="/settings">
                        <Button variant="outline" size="sm">
                          <Settings className="mr-2 h-4 w-4" />
                          {t("profile.editProfile")}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
                {friendActionError && (
                  <p className="mt-2 text-xs text-destructive">{friendActionError}</p>
                )}
                {profile.bio && (
                  <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
          <Card className="border-neon-muted/30 hover:border-glow transition-all text-center">
            <CardHeader className="p-3 sm:p-6 pb-1 sm:pb-2">
              <CardTitle className="text-lg sm:text-xl font-medium text-muted-foreground">
                {t("profile.wins")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <p className="text-3xl sm:text-4xl font-bold text-neon">{profile.wins ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="border-neon-muted/30 hover:border-glow transition-all text-center">
            <CardHeader className="p-3 sm:p-6 pb-1 sm:pb-2">
              <CardTitle className="text-lg sm:text-xl font-medium text-muted-foreground">
                {t("profile.losses")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <p className="text-3xl sm:text-4xl font-bold text-neon">{profile.losses ?? 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Match History */}
        <Card className="border-neon-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-medium">
              <Swords className="h-5 w-5 text-neon-muted" />
              {t("profile.matchHistory")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {matchesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : matches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t("profile.noMatches")}
              </p>
            ) : (
              <div className="space-y-2">
                {matches.map(renderMatchRow)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserProfilePage;
