import { usersBackend, Method } from "./request";
import type { MatchRecord, PlayerProfile, PlayerSearchResult } from "./types";

export const Players = {
  getByUserId: (userId: string) =>
    usersBackend<PlayerProfile>(`player/${userId}`, Method.GET),

  getMyProfile: () =>
    usersBackend<PlayerProfile>("me/profile", Method.GET),

  updateDisplayName: (display_name: string) =>
    usersBackend("me/profile/display-name", Method.POST, { display_name }),

  updateBio: (bio: string) =>
    usersBackend("me/profile/bio", Method.POST, { bio }),

  /** Search players by display name (partial, case-insensitive). Excludes self. */
  search: (q: string) =>
    usersBackend<{ players: PlayerSearchResult[] }>("players/search", Method.GET, { q }),

  /** Get match history for a specific player (public). */
  getMatchHistory: (userId: string) =>
    usersBackend<{ matches: MatchRecord[] }>(`player/${userId}/matches`, Method.GET),

  /** Get own match history (requires authentication). */
  getMyMatchHistory: () =>
    usersBackend<{ matches: MatchRecord[] }>("me/matches", Method.GET),
};
