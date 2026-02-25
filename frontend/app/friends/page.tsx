"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserX, Check, X, Loader2, Users, Search, UserPlus, UserCheck, MessageSquare, Send, Gamepad2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useChat } from "@/components/providers/chat-provider";
import { Friends } from "@/lib/backend/friends";
import { Players } from "@/lib/backend/players";
import { isRequestError } from "@/lib/backend";
import type { Friend, FriendRequest, PlayerSearchResult } from "@/lib/backend/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GAME_BACKEND_URL } from "@/lib/backend/config";

// ─── helpers ────────────────────────────────────────────────────────────────

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const resolveAvatar = (obj: { avatar?: string | null; avatar_url?: string | null }) =>
  obj.avatar || obj.avatar_url || null;

// ─── page ────────────────────────────────────────────────────────────────────

const FriendsPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { sendGameInvite, onlineUsers } = useChat();

  // lists
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  // search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── data fetching ────────────────────────────────────────────────────────

  const fetchFriends = useCallback(async () => {
    setLoadingFriends(true);
    try {
      const res = await Friends.list();
      setFriends(res.data.friends);
    } catch {
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const [incomingRes, sentRes] = await Promise.all([
        Friends.listRequests(),
        Friends.listSentRequests(),
      ]);
      setRequests(incomingRes.data.requests);
      setSentRequests(sentRes.data.requests);
    } catch {
      setRequests([]);
      setSentRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchFriends();
      fetchRequests();
    }
  }, [authLoading, isAuthenticated, fetchFriends, fetchRequests]);

  // ── search with debounce ─────────────────────────────────────────────────

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearchError("");
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    setSearchError("");

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await Players.search(q);
        setSearchResults(res.data.players);
      } catch (err) {
        if (isRequestError(err) && err.status === 400) {
          setSearchResults([]);
        } else {
          setSearchError(t("common.error"));
        }
      } finally {
        setSearchLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, t]);

  // ── actions ──────────────────────────────────────────────────────────────

  const handleAccept = async (requestId: string) => {
    setActionLoadingId(requestId);
    try {
      await Friends.acceptRequest(requestId);
      await Promise.all([fetchFriends(), fetchRequests()]);
    } catch {
      // silently fail
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoadingId(requestId);
    try {
      await Friends.rejectRequest(requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch {
      // silently fail
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemove = async (friendId: string) => {
    setActionLoadingId(friendId);
    try {
      await Friends.remove(friendId);
      setFriends((prev) => prev.filter((f) => f.user_id !== friendId));
    } catch {
      // silently fail
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSendRequest = async (userId: string) => {
    setActionLoadingId(userId);
    try {
      await Friends.sendRequest(userId);
      // Optimistically add to sentRequests so the button switches immediately
      setSentRequests((prev) => [
        ...prev,
        { receiver_id: userId } as FriendRequest,
      ]);
    } catch {
      // silently fail
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelRequest = async (receiverId: string) => {
    setActionLoadingId(receiverId);
    try {
      await Friends.cancelRequest(receiverId);
      setSentRequests((prev) => prev.filter((r) => r.receiver_id !== receiverId));
    } catch {
      // silently fail
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleInviteToGame = async (friend: Friend) => {
    if (invitingId) return;
    setInvitingId(friend.user_id);
    try {
      const response = await fetch(`${GAME_BACKEND_URL}/pong/rooms`, {
        method: "POST",
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data?.id) {
        sendGameInvite(friend.display_name, data.id);
        router.push(`/pong?room=${encodeURIComponent(data.id)}`);
      }
    } catch {
      // silently fail
    } finally {
      setInvitingId(null);
    }
  };

  // ── helpers ──────────────────────────────────────────────────────────────

  const getSearchStatus = (userId: string) => {
    if (friends.some((f) => f.user_id === userId)) return "friends";
    if (sentRequests.some((r) => r.receiver_id === userId)) return "pending_sent";
    if (requests.some((r) => r.sender_id === userId)) return "pending_received";
    return "none";
  };

  // ── auth guards ──────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{t("friends.notAuthenticated")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSearchActive = searchQuery.trim().length > 0;

  const renderSearchButton = (player: PlayerSearchResult) => {
    const status = getSearchStatus(player.user_id);
    const loading = actionLoadingId === player.user_id;

    if (status === "friends") {
      return (
        <Button size="sm" variant="outline" disabled className="h-8 gap-1.5 border-neon-muted/40 text-muted-foreground text-xs px-3">
          <UserCheck className="h-3.5 w-3.5" />
          {t("friends.alreadyFriends")}
        </Button>
      );
    }

    if (status === "pending_sent") {
      return (
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 border-neon-muted/50 text-muted-foreground hover:border-destructive hover:text-destructive text-xs px-3"
          onClick={() => handleCancelRequest(player.user_id)}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
          {t("friends.cancelRequest")}
        </Button>
      );
    }

    if (status === "pending_received") {
      return (
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 border-green-500/50 hover:border-green-500 hover:text-green-500 text-xs px-3"
          onClick={() => {
            const req = requests.find((r) => r.sender_id === player.user_id);
            if (req) handleAccept(req.id);
          }}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          {t("friends.acceptRequest")}
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 border-neon/50 hover:border-neon hover:text-neon text-xs px-3"
        onClick={() => handleSendRequest(player.user_id)}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <UserPlus className="h-3.5 w-3.5" />
        )}
        {t("friends.addFriend")}
      </Button>
    );
  };

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-start justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-2xl space-y-6 animate-fade-up">

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9 pr-4"
            placeholder={t("friends.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
          />
          {searchLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Search results */}
        {isSearchActive && (
          <Card className="border-neon-muted/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-muted-foreground">
                {t("friends.searchResults")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {searchLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("common.loading")}
                </div>
              ) : searchError ? (
                <p className="text-sm text-destructive">{searchError}</p>
              ) : searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("friends.noSearchResults")}</p>
              ) : (
                searchResults.map((player) => (
                  <div
                    key={player.user_id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-3 hover:border-neon-muted/50 transition-colors"
                  >
                    <Link
                      href={`/users/${player.user_id}`}
                      className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        {resolveAvatar(player) && (
                          <AvatarImage src={resolveAvatar(player)!} alt={player.display_name} />
                        )}
                        <AvatarFallback className="text-xs">{getInitials(player.display_name)}</AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium truncate">{player.display_name}</p>
                    </Link>
                    {renderSearchButton(player)}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Pending Requests */}
        {!isSearchActive && (loadingRequests || requests.length > 0) && (
          <Card className="border-neon/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-neon">
                {t("friends.pendingRequests")}
                {requests.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-neon/20 px-2 py-0.5 text-xs text-neon">
                    {requests.length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingRequests ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("common.loading")}
                </div>
              ) : requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("friends.noRequests")}</p>
              ) : (
                requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-3"
                  >
                    <Link
                      href={`/users/${req.sender_id}`}
                      className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        {resolveAvatar(req) && <AvatarImage src={resolveAvatar(req)!} alt={req.display_name} />}
                        <AvatarFallback className="text-xs">{getInitials(req.display_name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">{req.display_name}</span>
                    </Link>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 border-green-500/50 hover:border-green-500 hover:text-green-500"
                        onClick={() => handleAccept(req.id)}
                        disabled={actionLoadingId === req.id}
                        title={t("friends.accept")}
                      >
                        {actionLoadingId === req.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 border-destructive/50 hover:border-destructive hover:text-destructive"
                        onClick={() => handleReject(req.id)}
                        disabled={actionLoadingId === req.id}
                        title={t("friends.reject")}
                      >
                        {actionLoadingId === req.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Sent Requests */}
        {!isSearchActive && (loadingRequests || sentRequests.length > 0) && (
          <Card className="border-yellow-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-yellow-500">
                <Send className="h-4 w-4" />
                {t("friends.sentRequests")}
                {sentRequests.length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-500">
                    {sentRequests.length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingRequests ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("common.loading")}
                </div>
              ) : sentRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("friends.noSentRequests")}</p>
              ) : (
                sentRequests.map((req) => (
                  <div
                    key={req.receiver_id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-3"
                  >
                    <Link
                      href={`/users/${req.receiver_id}`}
                      className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        {resolveAvatar(req) && <AvatarImage src={resolveAvatar(req)!} alt={req.display_name} />}
                        <AvatarFallback className="text-xs">{getInitials(req.display_name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">{req.display_name}</span>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 border-destructive/50 hover:border-destructive hover:text-destructive text-xs px-3 shrink-0"
                      onClick={() => handleCancelRequest(req.receiver_id)}
                      disabled={actionLoadingId === req.receiver_id}
                    >
                      {actionLoadingId === req.receiver_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                      {t("friends.cancelRequest")}
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Friends List */}
        {!isSearchActive && (
          <Card className="border-glow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Users className="h-4 w-4" />
                {t("profile.friends")}
                {friends.length > 0 && (
                  <span className="ml-1 text-muted-foreground font-normal text-sm">
                    ({friends.length})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingFriends ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("common.loading")}
                </div>
              ) : friends.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("friends.noFriends")}</p>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend) => (
                    <div
                      key={friend.user_id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-3 hover:border-neon-muted/50 transition-colors"
                    >
                      <Link
                        href={`/users/${friend.user_id}`}
                        className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          {resolveAvatar(friend) && (
                            <AvatarImage src={resolveAvatar(friend)!} alt={friend.display_name} />
                          )}
                          <AvatarFallback className="text-xs">
                            {getInitials(friend.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{friend.display_name}</p>
                        </div>
                      </Link>
                      <div className="flex gap-2 shrink-0">
                        <Link href={`/chat?with=${encodeURIComponent(friend.display_name)}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 border-neon/30 hover:border-neon hover:text-neon"
                            title={t("chat.sendMessage")}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 border-neon/30 hover:border-neon hover:text-neon"
                          onClick={() => handleInviteToGame(friend)}
                          disabled={invitingId === friend.user_id || !onlineUsers.has(friend.display_name)}
                          title={t("game.inviteToGame")}
                        >
                          {invitingId === friend.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Gamepad2 className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 border-destructive/30 hover:border-destructive hover:text-destructive"
                          onClick={() => handleRemove(friend.user_id)}
                          disabled={actionLoadingId === friend.user_id}
                          title={t("friends.removeFriend")}
                        >
                          {actionLoadingId === friend.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserX className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FriendsPage;
