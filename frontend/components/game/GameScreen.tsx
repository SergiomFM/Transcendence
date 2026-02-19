"use client";

import { useState, Suspense, lazy, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Maximize, Minimize } from "lucide-react";
import { GAME_WS_URL, GAME_HTTP_URL, GAME_BACKEND_URL } from "@/lib/backend/config";
import { GameMode } from "./types";

const Pong = lazy(() => import("@/components/Pong"));

interface GameScreenProps {
  gameMode: GameMode;
  onBackToMenu: () => void;
}

export function GameScreen({ gameMode, onBackToMenu }: GameScreenProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  const isMobileViewport = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 640px)").matches;

  const lockLandscape = async () => {
    if (typeof screen === "undefined" || !screen.orientation?.lock) return;
    try {
      await screen.orientation.lock("landscape");
    } catch (err) {
      console.warn("Unable to lock orientation:", err);
    }
  };

  const unlockOrientation = () => {
    if (typeof screen === "undefined" || !screen.orientation?.unlock) return;
    try {
      screen.orientation.unlock();
    } catch (err) {
      console.warn("Unable to unlock orientation:", err);
    }
  };

  const requestFullscreen = async (target?: HTMLElement) => {
    const element = target ?? gameContainerRef.current;
    if (!element || document.fullscreenElement) return;
    try {
      await element.requestFullscreen();
      await lockLandscape();
    } catch (err) {
      console.error("Error attempting to enable fullscreen:", err);
    }
  };

  const exitFullscreen = async () => {
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch (err) {
      console.error("Error attempting to exit fullscreen:", err);
    } finally {
      unlockOrientation();
    }
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await requestFullscreen();
      setIsFullscreen(true);
    } else {
      await exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleBackToMenu = async () => {
    await exitFullscreen();
    onBackToMenu();
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (!active) {
        unlockOrientation();
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
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
          throw new Error("Failed to load rooms");
        }
        const data = await response.json();
        if (active) {
          setRooms(data);
        }
      } catch (error) {
        if (active) {
          setRoomsError("Unable to load rooms");
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
  }, [gameMode, selectedRoomId]);

  if (gameMode === "multiplayer") {
    if (selectedRoomId) {
      return (
        <div
          ref={gameContainerRef}
          className={cn(
            "w-full h-[90dvh] flex flex-col overflow-hidden bg-black",
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
                "relative",
                isFullscreen
                  ? "w-full h-full"
                  : "w-auto max-w-[95dvw] max-h-[80dvh] border-2 border-gray-700 rounded-lg shadow-2xl overflow-hidden"
              )}
            >
              <Suspense
                fallback={
                  <div className="flex items-center justify-center w-full h-full text-xl text-white">
                    Loading game...
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
                />
              </Suspense>

              <Button
                onClick={toggleFullscreen}
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5" />
                ) : (
                  <Maximize className="w-5 h-5" />
                )}
              </Button>
              <Button
                onClick={async () => {
                  await exitFullscreen();
                  setSelectedRoomId(null);
                }}
                variant="ghost"
                className="absolute top-4 left-4 z-50 bg-black/50 hover:bg-black/70 text-white"
              >
                Back to rooms
              </Button>
            </div>
          </div>

          {!isFullscreen && (
            <div className="text-center p-4 flex-shrink-0">
              <p className="text-sm text-gray-400">🌐 Multiplayer Rooms</p>
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="w-full h-[90dvh] flex flex-col items-center justify-center gap-6 p-8">
        <div className="text-center max-w-2xl">
          <h1 className="text-3xl font-bold">Multiplayer Rooms</h1>
          <p className="text-sm text-gray-400 mt-2">
            Choose a room to spectate or grab a seat.
          </p>
        </div>
        <div className="w-full max-w-3xl border border-gray-700 rounded-xl p-6 bg-black/40 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Active Rooms</h2>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    try {
                      const response = await fetch(`${GAME_BACKEND_URL}/pong/rooms`, {
                        method: "POST",
                      });
                  if (!response.ok) {
                    throw new Error("Failed to create room");
                  }
                  const data = await response.json();
                      if (data?.id) {
                        setSelectedRoomId(data.id);
                      }
                    } catch (error) {
                      setRoomsError("Unable to create room");
                    }
                  }}
                >
              Create Room
            </Button>
          </div>
          <div className="space-y-3">
            {roomsLoading && (
              <div className="text-sm text-gray-400">Loading rooms...</div>
            )}
            {roomsError && (
              <div className="text-sm text-red-300">{roomsError}</div>
            )}
            {!roomsLoading && !roomsError && rooms.length === 0 && (
              <div className="text-sm text-gray-400">No active rooms yet.</div>
            )}
            {rooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between rounded-lg border border-gray-700/70 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold">{room.id}</div>
                  <div className="text-xs text-gray-400">
                    Players: {room.players} · Spectators: {room.spectators}
                  </div>
                  {room.score && (
                    <div className="text-xs text-gray-500">
                      Score: {room.score.player1} - {room.score.player2}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-300">
                  {room.running ? "In match" : "Waiting"}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedRoomId(room.id)}
                >
                  Join
                </Button>
              </div>
            ))}
          </div>
        </div>
        <Button variant="ghost" onClick={handleBackToMenu}>
          Back to menu
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={gameContainerRef}
      className={cn(
        "w-full h-[90dvh] flex flex-col overflow-hidden bg-black",
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
            "relative",
            isFullscreen
              ? "w-full h-full"
              : "w-auto max-w-[95dvw] max-h-[80dvh] border-2 border-gray-700 rounded-lg shadow-2xl overflow-hidden"
          )}
        >
          <Suspense
            fallback={
              <div className="flex items-center justify-center w-full h-full text-xl text-white">
                Loading game...
              </div>
            }
          >
            <Pong
              className="w-full h-full min-w-full min-h-full"
              online={gameMode === "online"}
              serverUrl={GAME_WS_URL}
              gameServerUrl={GAME_HTTP_URL}
            />
          </Suspense>

          <Button
            onClick={toggleFullscreen}
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize className="w-5 h-5" />
            ) : (
              <Maximize className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      {!isFullscreen && (
        <div className="text-center p-4 flex-shrink-0">
          <p className="text-sm text-gray-400">
            {gameMode === "online"
              ? "🌐 Online Multiplayer Mode"
              : "🎮 Local Single Player Mode"}
          </p>
        </div>
      )}
    </div>
  );
}
