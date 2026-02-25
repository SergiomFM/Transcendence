"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/providers/auth-provider";
import { useChat } from "@/components/providers/chat-provider";
import { Friends as FriendsApi } from "@/lib/backend/friends";
import type { Friend, FriendRequest } from "@/lib/backend/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  User,
  Sun,
  Moon,
  Users,
  UserPlus,
  MessageSquare,
  Bell,
  Gamepad2,
} from "lucide-react";

const LOCALES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "cv", label: "Kriolu", flag: "🇨🇻" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "he", label: "עברית", flag: "🇮🇱" },
] as const;

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const resolveAvatar = (obj: { avatar?: string | null; avatar_url?: string | null }) =>
  obj.avatar || obj.avatar_url || null;

export function Navbar() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { unreadCount, unreadEntries, clearUnread, gameInvites, clearGameInvite } = useChat();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);

  // Fetch friends + friend requests
  const fetchNotificationData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        FriendsApi.list(),
        FriendsApi.listRequests(),
      ]);
      setFriends(friendsRes.data.friends);
      setFriendRequests(requestsRes.data.requests);
    } catch {
      // silently fail
    }
  }, [isAuthenticated]);

  // Initial fetch on auth
  useEffect(() => {
    fetchNotificationData();
  }, [fetchNotificationData]);

  // Poll every 10 seconds
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(fetchNotificationData, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotificationData]);

  // Re-fetch when tab becomes visible or window gains focus
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchNotificationData();
      }
    };
    const handleFocus = () => fetchNotificationData();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isAuthenticated, fetchNotificationData]);

  const handleLogout = async () => {
    await logout();
  };

  const switchLocale = (newLocale: string) => {
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
    window.location.reload();
  };

  // Helper to find friend info by display_name
  const getFriend = (displayName: string) =>
    friends.find((f) => f.display_name === displayName);

  const totalNotifications = unreadCount + friendRequests.length + gameInvites.length;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between mx-auto px-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-xl sm:text-2xl tracking-wide text-primary text-glow transition-all hover:text-glow-strong"
          >
            Transcendence
          </Link>
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground transition-all hover:text-neon hover:text-glow"
            >
              {t("navbar.home")}
            </Link>
            <Link
              href="/pong"
              className="text-sm font-medium text-muted-foreground transition-all hover:text-neon hover:text-glow"
              onClick={(e) => {
                if (pathname === "/pong") {
                  e.preventDefault();
                  window.dispatchEvent(new Event("pong:back-to-menu"));
                }
              }}
            >
              {t("navbar.play")}
            </Link>
            {isAuthenticated && (
              <Link
                href="/friends"
                className="text-sm font-medium text-muted-foreground transition-all hover:text-neon hover:text-glow"
              >
                {t("navbar.friends")}
              </Link>
            )}
            {isAuthenticated && (
              <Link
                href="/chat"
                className="text-sm font-medium text-muted-foreground transition-all hover:text-neon hover:text-glow"
              >
                {t("navbar.chat")}
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 hidden dark:block" />
            <Moon className="h-4 w-4 block dark:hidden" />
          </Button>

          {/* ── notification bell dropdown ── */}
          {isAuthenticated && (
            <DropdownMenu onOpenChange={(open) => { if (open) fetchNotificationData(); }}>
              <DropdownMenuTrigger asChild>
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("navbar.notifications")}
                  >
                    <Bell className="h-4 w-4" />
                  </Button>
                  {totalNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-neon px-1 text-[10px] font-bold text-background animate-pulse-glow pointer-events-none">
                      {totalNotifications > 99 ? "99+" : totalNotifications}
                    </span>
                  )}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-72 sm:w-80 max-h-80 overflow-y-auto"
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
                  <span className="text-sm font-semibold">
                    {t("navbar.notifications")}
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => clearUnread()}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t("navbar.clearAll")}
                    </button>
                  )}
                </div>
                {totalNotifications === 0 ? (
                  <div className="px-3 py-6 text-center">
                    <Bell className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {t("navbar.noNotifications")}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* ── Friend requests ── */}
                    {friendRequests.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 border-b border-border/50">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t("navbar.friendRequests")}
                          </span>
                        </div>
                        {friendRequests.map((req) => {
                          const avatarSrc = req.avatar || req.avatar_url;
                          return (
                            <DropdownMenuItem
                              key={req.id}
                              className="cursor-pointer px-3 py-2.5 focus:bg-muted/50"
                              onClick={() => router.push("/friends")}
                            >
                              <div className="flex items-start gap-3 w-full">
                                <button
                                  type="button"
                                  className="shrink-0 mt-0.5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/users/${req.sender_id}`);
                                  }}
                                >
                                  <Avatar className="h-8 w-8 ring-1 ring-border hover:ring-neon transition-shadow">
                                    {avatarSrc ? (
                                      <AvatarImage src={avatarSrc} alt={req.display_name} />
                                    ) : null}
                                    <AvatarFallback className="text-xs">
                                      {getInitials(req.display_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium truncate">
                                      {req.display_name}
                                    </span>
                                    <UserPlus className="h-3.5 w-3.5 shrink-0 text-neon" />
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                                    {t("navbar.friendRequest")}
                                  </p>
                                </div>
                              </div>
                            </DropdownMenuItem>
                          );
                        })}
                      </>
                    )}

                    {/* ── Chat messages ── */}
                    {unreadEntries.length > 0 && (
                      <>
                        {friendRequests.length > 0 && (
                          <div className="px-3 py-1.5 border-b border-border/50">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              {t("navbar.chat")}
                            </span>
                          </div>
                        )}
                        {unreadEntries.map((entry) => {
                          const friend = getFriend(entry.from);
                          const profileHref = friend
                            ? `/users/${friend.user_id}`
                            : undefined;
                          const chatHref = `/chat?with=${encodeURIComponent(entry.from)}`;
                          return (
                            <DropdownMenuItem
                              key={entry.from}
                              className="cursor-pointer px-3 py-2.5 focus:bg-muted/50"
                              onClick={() => router.push(chatHref)}
                            >
                              <div className="flex items-start gap-3 w-full">
                                {/* avatar — navigates to profile */}
                                <button
                                  type="button"
                                  className="shrink-0 mt-0.5"
                                  onClick={(e) => {
                                    if (profileHref) {
                                      e.stopPropagation();
                                      router.push(profileHref);
                                    }
                                  }}
                                >
                                  <Avatar className="h-8 w-8 ring-1 ring-border hover:ring-neon transition-shadow">
                                    {friend && resolveAvatar(friend) ? (
                                      <AvatarImage
                                        src={resolveAvatar(friend)!}
                                        alt={entry.from}
                                      />
                                    ) : null}
                                    <AvatarFallback className="text-xs">
                                      {getInitials(entry.from)}
                                    </AvatarFallback>
                                  </Avatar>
                                </button>
                                {/* name + message preview */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium truncate">
                                      {entry.from}
                                    </span>
                                    <span className="shrink-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-neon px-1 text-[10px] font-bold text-background">
                                      {entry.count}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                                    {entry.lastMessage}
                                  </p>
                                </div>
                              </div>
                            </DropdownMenuItem>
                          );
                        })}
                      </>
                    )}

                    {/* ── Game invites ── */}
                    {gameInvites.length > 0 && (
                      <>
                        {(friendRequests.length > 0 || unreadEntries.length > 0) && (
                          <div className="px-3 py-1.5 border-b border-border/50">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              {t("game.gameInvites")}
                            </span>
                          </div>
                        )}
                        {gameInvites.map((invite) => {
                          const friend = getFriend(invite.from);
                          return (
                            <DropdownMenuItem
                              key={`${invite.roomId}-${invite.from}`}
                              className="cursor-pointer px-3 py-2.5 focus:bg-muted/50"
                              onClick={() => {
                                clearGameInvite(invite.roomId);
                                router.push(`/pong?room=${encodeURIComponent(invite.roomId)}`);
                              }}
                            >
                              <div className="flex items-start gap-3 w-full">
                                <button
                                  type="button"
                                  className="shrink-0 mt-0.5"
                                  onClick={(e) => {
                                    if (friend) {
                                      e.stopPropagation();
                                      router.push(`/users/${friend.user_id}`);
                                    }
                                  }}
                                >
                                  <Avatar className="h-8 w-8 ring-1 ring-border hover:ring-neon transition-shadow">
                                    {friend && resolveAvatar(friend) ? (
                                      <AvatarImage
                                        src={resolveAvatar(friend)!}
                                        alt={invite.from}
                                      />
                                    ) : null}
                                    <AvatarFallback className="text-xs">
                                      {getInitials(invite.from)}
                                    </AvatarFallback>
                                  </Avatar>
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium truncate">
                                      {invite.from}
                                    </span>
                                    <Gamepad2 className="h-3.5 w-3.5 shrink-0 text-neon" />
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                                    {t("game.inviteReceivedLabel")}
                                  </p>
                                </div>
                              </div>
                            </DropdownMenuItem>
                          );
                        })}
                      </>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <span>
                  {LOCALES.find((l) => l.code === locale)?.flag}
                </span>
                <span className="hidden sm:inline text-sm">
                  {LOCALES.find((l) => l.code === locale)?.label}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {LOCALES.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onClick={() => switchLocale(l.code)}
                  className={locale === l.code ? "font-semibold" : ""}
                >
                  <span className="mr-2">{l.flag}</span>
                  {l.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {isLoading ? (
            <div className="h-8 w-8 animate-pulse pixel-corners-sm bg-muted" />
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 pixel-corners-sm"
                >
                  <Avatar key={user.avatar || "no-avatar"} className="h-8 w-8 ring-1 ring-neon-muted transition-shadow hover:ring-neon hover:shadow-[0_0_10px_var(--neon-muted)]">
                    {user.avatar ? (
                      <AvatarImage
                        src={user.avatar}
                        alt={user.alias || user.username}
                      />
                    ) : null}
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user.alias || user.username}</p>
                    <p className="w-50 truncate text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuItem asChild>
                  <Link href={`/users/${user.id}`} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    {t("navbar.profile")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/friends" className="cursor-pointer">
                    <Users className="mr-2 h-4 w-4" />
                    {t("navbar.friends")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/chat" className="cursor-pointer">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {t("navbar.chat")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-red-600 focus:text-red-600"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("common.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth">
              <Button variant="default" size="sm" className="animate-pulse-glow">
                {t("common.login")}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
