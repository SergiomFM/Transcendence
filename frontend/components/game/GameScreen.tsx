"use client";

import { useState, Suspense, lazy, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Maximize, Minimize, Volume2, Volume1, VolumeX } from "lucide-react";
import { GAME_WS_URL, GAME_HTTP_URL, GAME_BACKEND_URL, LOBBY_WS_URL } from "@/lib/backend/config";
import { GameMode } from "./types";
import type { ChatMessage, RoomUser } from "./types";
import { cycleVolume, getVolumeState } from "@/components/Pong/pongAudio";
import type { VolumeState } from "@/components/Pong/pongAudio";
import { ConnectedPlayers } from "./ConnectedPlayers";
import { RoomChat } from "./RoomChat";
import { useInputMethod } from "@/lib/useInputMethod";

const Pong = lazy(() => import("@/components/Pong"));

interface GameScreenProps {
  gameMode: GameMode;
  onBackToMenu: () => void;
  initialRoomId?: string | null;
}

export function GameScreen({ gameMode, onBackToMenu, initialRoomId }: GameScreenProps) {
  const t = useTranslations();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(true);
  const [muted, setMuted] = useState<VolumeState>(getVolumeState());
  
  // Detect active input method (keyboard, gamepad, or touch)
  const inputMethod = useInputMethod(isFullscreen);
  const [rooms, setRooms] = useState<
    Array<{
      id: string;
      players: number;
      spectators: number;
      running: boolean;
      score?: { player1: number; player2: number };
    }>
  >([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const handleSessionReplaced = useCallback(() => setSelectedRoomId(null), []);

  // Room chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const sendChatRef = useRef<((content: string) => void) | null>(null);

  // Room users state (driven by WebSocket ROOM_USERS events)
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);

  const handleRoomUsers = useCallback((users: RoomUser[]) => {
    setRoomUsers(users);
  }, []);

  const handleChatMessage = useCallback((message: ChatMessage) => {
    setChatMessages((prev) => {
      // Deduplicate by message id
      if (prev.some((m) => m.id === message.id)) return prev;
      const next = [...prev, message];
      // Keep at most 50 messages client-side
      return next.length > 50 ? next.slice(next.length - 50) : next;
    });
  }, []);

  const handleSocketReady = useCallback((send: (content: string) => void) => {
    sendChatRef.current = send;
  }, []);

  const handleSendChat = useCallback((content: string) => {
    sendChatRef.current?.(content);
  }, []);

  // Fetch chat history when joining a room
  useEffect(() => {
    if (!selectedRoomId) {
      setChatMessages([]);
      setRoomUsers([]);
      sendChatRef.current = null;
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await fetch(
          `${GAME_BACKEND_URL}/pong/rooms/${encodeURIComponent(selectedRoomId)}/chat`
        );
        if (!res.ok) return;
        const history: ChatMessage[] = await res.json();
        if (active) setChatMessages(history);
      } catch {
        // ignore
      }
    })();
    return () => { active = false; };
  }, [selectedRoomId]);

  // Auto-select room from initialRoomId (invite link)
  useEffect(() => {
    if (initialRoomId) {
      setSelectedRoomId(initialRoomId);
    }
  }, [initialRoomId]);

  const handleToggleMute = useCallback(() => {
    const newState = cycleVolume();
    setMuted(newState);
  }, []);

  // Detect whether the Fullscreen API is available (including webkit prefix for iOS)
  useEffect(() => {
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
    const standard = typeof document.fullscreenEnabled !== "undefined" && document.fullscreenEnabled;
    const webkit = typeof el.webkitRequestFullscreen === "function";
    setCanFullscreen(standard || webkit);
  }, []);

  const lockLandscape = async () => {
    if (typeof screen === "undefined" || !screen.orientation) return;
    if (!("lock" in screen.orientation)) return;
    type OrientationLock = "any" | "natural" | "landscape" | "portrait" | "portrait-primary" | "portrait-secondary" | "landscape-primary" | "landscape-secondary";
    try {
      await (screen.orientation as ScreenOrientation & { lock: (orientation: OrientationLock) => Promise<void> }).lock(
        "landscape"
      );
    } catch (err) {
    }
  };

  const unlockOrientation = () => {
    if (typeof screen === "undefined" || !screen.orientation) return;
    if (!("unlock" in screen.orientation)) return;
    try {
      (screen.orientation as ScreenOrientation & { unlock: () => void }).unlock();
    } catch (err) {
    }
  };

  const requestFullscreen = async (target?: HTMLElement) => {
    const element = target ?? gameContainerRef.current;
    if (!element) return;
    const el = element as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
    const doc = document as Document & { webkitFullscreenElement?: Element };
    if (document.fullscreenElement || doc.webkitFullscreenElement) return;
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      }
      await lockLandscape();
    } catch (err) {
      console.error("Error attempting to enable fullscreen:", err);
    }
  };

  const exitFullscreen = async () => {
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => Promise<void> };
    if (!document.fullscreenElement && !doc.webkitFullscreenElement) return;
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      }
    } catch (err) {
      console.error("Error attempting to exit fullscreen:", err);
    } finally {
      unlockOrientation();
    }
  };

  const toggleFullscreen = async () => {
    const doc = document as Document & { webkitFullscreenElement?: Element };
    if (!document.fullscreenElement && !doc.webkitFullscreenElement) {
      await requestFullscreen();
      setIsFullscreen(true);
    } else {
      await exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleBackToMenu = () => {
    onBackToMenu();
  };

  useEffect(() => {
    const doc = document as Document & { webkitFullscreenElement?: Element };
    const handleFullscreenChange = () => {
      const active = !!(document.fullscreenElement || doc.webkitFullscreenElement);
      setIsFullscreen(active);
      if (!active) {
        unlockOrientation();
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (gameMode !== "multiplayer" || selectedRoomId) return;

    setRoomsLoading(true);
    setRoomsError(null);

    const ws = new WebSocket(LOBBY_WS_URL);

    ws.onopen = () => {
      setRoomsLoading(false);
      setRoomsError(null);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "ROOM_LIST") {
          setRooms(msg.rooms);
          setRoomsLoading(false);
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => {
      setRoomsError(t("game.unableToLoadRooms"));
      setRoomsLoading(false);
    };

    ws.onclose = () => {
      // Connection lost — not necessarily an error if we're navigating away
    };

    return () => {
      ws.close();
    };
  }, [gameMode, selectedRoomId, t]);

  if (gameMode === "multiplayer") {
    if (selectedRoomId) {
      return (
        <div
          ref={gameContainerRef}
          className={cn(
            "game-shell w-full flex flex-col overflow-hidden bg-background",
            isFullscreen ? "h-[100dvh] relative" : "flex-1 min-h-0"
          )}
        >
           <div
             className={cn(
               "w-full flex flex-col overflow-hidden",
               isFullscreen ? "flex-1" : "shrink-0"
             )}
           >
             <div
               className={cn(
                 "flex justify-center overflow-hidden",
                 isFullscreen ? "flex-1 items-center p-0" : "items-start sm:items-center sm:flex-1 p-2 sm:p-4 min-h-0"
               )}
             >
              <div
                className={cn(
                  "game-frame relative",
                  isFullscreen
                    ? "w-full h-full"
                    : "w-full max-h-full border-2 border-border shadow-2xl overflow-hidden"
                )}
                style={!isFullscreen ? { aspectRatio: "16 / 9", maxWidth: "calc((100dvh - 10rem) * 16 / 9)" } : undefined}
              >
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center w-full h-full text-xl text-white">
                      {t("game.loadingGame")}
                    </div>
                  }
                >
                  <Pong
                    className="w-full h-full min-w-full min-h-full"
                    online
                    serverUrl={GAME_WS_URL}
                    gameServerUrl={GAME_HTTP_URL}
                    roomId={selectedRoomId}
                    onSessionReplaced={handleSessionReplaced}
                    isFullscreen={isFullscreen}
                    onChatMessage={handleChatMessage}
                    onSocketReady={handleSocketReady}
                    onRoomUsers={handleRoomUsers}
                  />
                </Suspense>

                {canFullscreen && (
                <button
                  onClick={toggleFullscreen}
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-neon/80 hover:text-neon bg-black/60 border border-neon-muted/30 hover:border-neon-muted/60 pixel-corners-sm transition-colors cursor-pointer touch-none select-none"
                  onContextMenu={(event) => event.preventDefault()}
                  title={isFullscreen ? t("game.exitFullscreen") : t("game.enterFullscreen")}
                >
                  {isFullscreen ? (
                    <Minimize className="w-4 h-4" />
                  ) : (
                    <Maximize className="w-4 h-4" />
                  )}
                </button>
                )}
                <button
                  onClick={handleToggleMute}
                  onMouseDown={(e) => e.preventDefault()}
                  className={cn(
                    "absolute top-4 z-50 flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-neon/80 hover:text-neon bg-black/60 border border-neon-muted/30 hover:border-neon-muted/60 pixel-corners-sm transition-colors cursor-pointer touch-none select-none",
                    canFullscreen ? "right-[3.75rem]" : "right-4"
                  )}
                  onContextMenu={(event) => event.preventDefault()}
                  title={
                    muted === "all-muted"
                      ? t("game.unmute")
                      : muted === "music-muted"
                        ? t("game.muteAll")
                        : t("game.muteMusic")
                  }
                >
                  {muted === "all-muted" ? (
                    <VolumeX className="w-4 h-4" />
                  ) : muted === "music-muted" ? (
                    <Volume1 className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={async () => {
                    await exitFullscreen();
                    setSelectedRoomId(null);
                  }}
                  className="absolute top-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-neon/80 hover:text-neon bg-black/60 border border-neon-muted/30 hover:border-neon-muted/60 pixel-corners-sm transition-colors cursor-pointer touch-none select-none"
                  onContextMenu={(event) => event.preventDefault()}
                >
                  {t("game.backToRooms")}
                </button>
                {/* Desktop (sm+): ConnectedPlayers bottom-left, Chat bottom-right as overlays */}
                <div className="hidden sm:block">
                  <ConnectedPlayers roomId={selectedRoomId} hidden={inputMethod === "touch"} users={roomUsers} />
                  <RoomChat
                    roomId={selectedRoomId}
                    hidden={inputMethod === "touch"}
                    messages={chatMessages}
                    onSend={handleSendChat}
                  />
                </div>
              </div>
            </div>
           </div>

          {/* Mobile (<sm): show below the game frame, outside fullscreen container */}
          {!isFullscreen && (
            <div className="sm:hidden px-2 pb-2 flex flex-col gap-1 flex-1 min-h-0 overflow-hidden">
              <ConnectedPlayers
                roomId={selectedRoomId}
                className="static w-full shrink-0"
                users={roomUsers}
              />
              <RoomChat
                roomId={selectedRoomId}
                messages={chatMessages}
                onSend={handleSendChat}
                className="static w-full flex-1 min-h-0 items-start"
              />
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="w-full flex-1 min-h-0 flex flex-col items-center justify-center gap-4 sm:gap-6 p-4 sm:p-8 animate-fade-up">
        <div className="text-center max-w-2xl">
          <h1 className="text-2xl sm:text-4xl text-primary text-glow-strong tracking-wide">{t("game.multiplayerRooms")}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {t("game.multiplayerRoomsSubtitle")}
          </p>
        </div>
        <div className="w-full max-w-3xl rounded-xl border-glow p-3 sm:p-6 bg-card/80 backdrop-blur-sm text-foreground">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-base sm:text-lg font-semibold">{t("game.activeRooms")}</h2>
            <Button
              size="sm"
              className="shrink-0 animate-pulse-glow"
              onClick={async () => {
                try {
                  const response = await fetch(`${GAME_BACKEND_URL}/pong/rooms`, {
                    method: "POST",
                  });
                  if (!response.ok) {
                    throw new Error(t("game.failedToCreateRoom"));
                  }
                  const data = await response.json();
                  if (data?.id) {
                    setSelectedRoomId(data.id);
                  }
                } catch (_error) {
                  setRoomsError(t("game.unableToCreateRoom"));
                }
              }}
            >
              {t("game.createRoom")}
            </Button>
          </div>
          <div className="space-y-3">
            {roomsLoading && (
              <div className="text-sm text-muted-foreground">{t("game.loadingRooms")}</div>
            )}
            {roomsError && (
              <div className="text-sm text-destructive">{roomsError}</div>
            )}
            {!roomsLoading && !roomsError && rooms.length === 0 && (
              <div className="text-sm text-muted-foreground">{t("game.noActiveRooms")}</div>
            )}
            {rooms.map((room) => (
              <div
                key={room.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 rounded-lg border border-neon-muted/30 px-3 sm:px-4 py-3 hover:border-glow transition-all"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{room.id}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("game.players")}: {room.players} · {t("game.spectators")}: {room.spectators}
                  </div>
                  {room.score && (
                    <div className="text-xs text-muted-foreground">
                      {t("game.score")}: {room.score.player1} - {room.score.player2}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className={`inline-block w-2 h-2 rounded-full ${room.running ? "bg-neon animate-status-pulse" : "bg-muted-foreground"}`} />
                    <span className="text-muted-foreground">
                      {room.running ? t("game.inMatch") : t("game.waiting")}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setSelectedRoomId(room.id)}
                  >
                    {t("game.join")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <Button variant="ghost" onClick={handleBackToMenu}>
          {t("game.backToMenu")}
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={gameContainerRef}
      className={cn(
        "game-shell w-full flex-1 min-h-0 flex flex-col overflow-hidden bg-background",
        isFullscreen && "relative"
      )}
    >
      <div
        className={cn(
          "flex-1 flex justify-center overflow-hidden",
          isFullscreen ? "items-center p-0" : "items-start sm:items-center p-2 sm:p-4"
        )}
      >
        <div
          className={cn(
            "game-frame relative",
            isFullscreen
              ? "w-full h-full"
              : "w-full max-h-full border-2 border-border shadow-2xl overflow-hidden"
          )}
          style={!isFullscreen ? { aspectRatio: "16 / 9", maxWidth: "calc((100dvh - 10rem) * 16 / 9)" } : undefined}
        >
          <Suspense
            fallback={
              <div className="flex items-center justify-center w-full h-full text-xl text-white">
                {t("game.loadingGame")}
              </div>
            }
          >
            <Pong
              className="w-full h-full min-w-full min-h-full"
              online={gameMode === "online"}
              serverUrl={GAME_WS_URL}
              gameServerUrl={GAME_HTTP_URL}
              isFullscreen={isFullscreen}
            />
          </Suspense>

          {canFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-neon/80 hover:text-neon bg-black/60 border border-neon-muted/30 hover:border-neon-muted/60 pixel-corners-sm transition-colors cursor-pointer touch-none select-none"
            onContextMenu={(event) => event.preventDefault()}
            title={isFullscreen ? t("game.exitFullscreen") : t("game.enterFullscreen")}
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </button>
          )}
          <button
            onClick={handleToggleMute}
            className={cn(
              "absolute top-4 z-50 flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-neon/80 hover:text-neon bg-black/60 border border-neon-muted/30 hover:border-neon-muted/60 pixel-corners-sm transition-colors cursor-pointer touch-none select-none",
              canFullscreen ? "right-[3.75rem]" : "right-4"
            )}
            onContextMenu={(event) => event.preventDefault()}
            title={
              muted === "all-muted"
                ? t("game.unmute")
                : muted === "music-muted"
                  ? t("game.muteAll")
                  : t("game.muteMusic")
            }
          >
            {muted === "all-muted" ? (
              <VolumeX className="w-4 h-4" />
            ) : muted === "music-muted" ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {!isFullscreen && (
        <div className="text-center p-4 flex-shrink-0">
          <p className="text-sm text-muted-foreground">
            {gameMode === "online"
              ? t("game.onlineMode")
              : t("game.localMode")}
          </p>
        </div>
      )}
    </div>
  );
}
