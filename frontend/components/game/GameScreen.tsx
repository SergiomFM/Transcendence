"use client";

import { useState, Suspense, lazy, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Maximize, Minimize, Volume2, Volume1, VolumeX } from "lucide-react";
import { GAME_WS_URL, GAME_HTTP_URL, GAME_BACKEND_URL } from "@/lib/backend/config";
import { GameMode } from "./types";
import { cycleVolume, getVolumeState } from "@/components/Pong/pongAudio";
import type { VolumeState } from "@/components/Pong/pongAudio";
import { ConnectedPlayers } from "./ConnectedPlayers";

const Pong = lazy(() => import("@/components/Pong"));

interface GameScreenProps {
  gameMode: GameMode;
  onBackToMenu: () => void;
}

export function GameScreen({ gameMode, onBackToMenu }: GameScreenProps) {
  const t = useTranslations();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [muted, setMuted] = useState<VolumeState>(getVolumeState());
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

  // Detect touch device
  useEffect(() => {
    const hasTouch =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouch);
  }, []);

  const isMobileViewport = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 640px)").matches;

  const lockLandscape = async () => {
    if (typeof screen === "undefined" || !screen.orientation) return;
    if (!("lock" in screen.orientation)) return;
    type OrientationLock = "any" | "natural" | "landscape" | "portrait" | "portrait-primary" | "portrait-secondary" | "landscape-primary" | "landscape-secondary";
    try {
      await (screen.orientation as ScreenOrientation & { lock: (orientation: OrientationLock) => Promise<void> }).lock(
        "landscape"
      );
    } catch (err) {
      console.warn("Unable to lock orientation:", err);
    }
  };

  const unlockOrientation = () => {
    if (typeof screen === "undefined" || !screen.orientation) return;
    if (!("unlock" in screen.orientation)) return;
    try {
      (screen.orientation as ScreenOrientation & { unlock: () => void }).unlock();
    } catch (err) {
      console.warn("Unable to unlock orientation:", err);
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
    if (!canFullscreen) return;
    if (gameMode !== "multiplayer" || !selectedRoomId) return;
    if (!isMobileViewport()) return;
    const raf = requestAnimationFrame(() => {
      if (gameContainerRef.current) {
        requestFullscreen(gameContainerRef.current);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [gameMode, selectedRoomId]);

  useEffect(() => {
    if (gameMode !== "multiplayer" || selectedRoomId) return;
    let active = true;
    const loadRooms = async () => {
      setRoomsLoading(true);
      setRoomsError(null);
      try {
        const response = await fetch(`${GAME_BACKEND_URL}/pong/rooms`);
        if (!response.ok) {
          throw new Error(t("game.failedToLoadRooms"));
        }
        const data = await response.json();
        if (active) {
          setRooms(data);
        }
      } catch (error) {
        if (active) {
          setRoomsError(t("game.unableToLoadRooms"));
        }
      } finally {
        if (active) {
          setRoomsLoading(false);
        }
      }
    };
    loadRooms();
    const interval = setInterval(loadRooms, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [gameMode, selectedRoomId, t]);

  if (gameMode === "multiplayer") {
    if (selectedRoomId) {
      return (
        <div
          ref={gameContainerRef}
          className={cn(
            "game-shell w-full h-[90dvh] flex flex-col overflow-hidden bg-background",
            isFullscreen && "relative"
          )}
        >
          <div
            className={cn(
              "flex-1 flex justify-center items-center overflow-hidden",
              isFullscreen ? "p-0" : "p-4"
            )}
          >
            <div
              className={cn(
                "game-frame relative",
                isFullscreen
                  ? "w-full h-full"
                  : "w-full max-h-full border-2 border-border shadow-2xl overflow-hidden"
              )}
              style={!isFullscreen ? { aspectRatio: "16 / 9" } : undefined}
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
                />
              </Suspense>

              {canFullscreen && (
              <Button
                onClick={toggleFullscreen}
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white touch-none select-none"
                onContextMenu={(event) => event.preventDefault()}
                title={isFullscreen ? t("game.exitFullscreen") : t("game.enterFullscreen")}
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5" />
                ) : (
                  <Maximize className="w-5 h-5" />
                )}
              </Button>
              )}
              <Button
                onClick={handleToggleMute}
                variant="ghost"
                size="icon"
                className={cn(
                  "absolute top-4 z-50 bg-black/50 hover:bg-black/70 text-white touch-none select-none",
                  canFullscreen ? "right-14" : "right-4"
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
                  <VolumeX className="w-5 h-5" />
                ) : muted === "music-muted" ? (
                  <Volume1 className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </Button>
              <Button
                onClick={async () => {
                  await exitFullscreen();
                  setSelectedRoomId(null);
                }}
                variant="ghost"
                className="absolute top-4 left-4 z-50 bg-black/50 hover:bg-black/70 text-white touch-none select-none"
                onContextMenu={(event) => event.preventDefault()}
              >
                {t("game.backToRooms")}
              </Button>
              <ConnectedPlayers roomId={selectedRoomId} hidden={isFullscreen && isTouchDevice} />
            </div>
          </div>

          {!isFullscreen && (
            <div className="text-center p-4 flex-shrink-0">
              <p className="text-sm text-muted-foreground">{t("game.multiplayerRooms")}</p>
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="w-full h-[90dvh] flex flex-col items-center justify-center gap-4 sm:gap-6 p-4 sm:p-8 animate-fade-up">
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
                } catch (error) {
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
        "game-shell w-full h-[90dvh] flex flex-col overflow-hidden bg-background",
        isFullscreen && "relative"
      )}
    >
      <div
        className={cn(
          "flex-1 flex justify-center items-center overflow-hidden",
          isFullscreen ? "p-0" : "p-4"
        )}
      >
        <div
          className={cn(
            "game-frame relative",
            isFullscreen
              ? "w-full h-full"
              : "w-full max-h-full border-2 border-border shadow-2xl overflow-hidden"
          )}
          style={!isFullscreen ? { aspectRatio: "16 / 9" } : undefined}
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
          <Button
            onClick={toggleFullscreen}
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white touch-none select-none"
            onContextMenu={(event) => event.preventDefault()}
            title={isFullscreen ? t("game.exitFullscreen") : t("game.enterFullscreen")}
          >
            {isFullscreen ? (
              <Minimize className="w-5 h-5" />
            ) : (
              <Maximize className="w-5 h-5" />
            )}
          </Button>
          )}
          <Button
            onClick={handleToggleMute}
            variant="ghost"
            size="icon"
            className={cn(
              "absolute top-4 z-50 bg-black/50 hover:bg-black/70 text-white touch-none select-none",
              canFullscreen ? "right-14" : "right-4"
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
              <VolumeX className="w-5 h-5" />
            ) : muted === "music-muted" ? (
              <Volume1 className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </Button>
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
