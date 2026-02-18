import { usersBackend, Method } from "./request";
import type { PlayerProfile } from "./types";

export const Players = {
  getByUserId: (userId: string) =>
    usersBackend<PlayerProfile>(`player/${userId}`, Method.GET),

  getMyProfile: () =>
    usersBackend<PlayerProfile>("me/profile", Method.GET),

  updateDisplayName: (display_name: string) =>
    usersBackend("me/profile/display-name", Method.POST, { display_name }),

  updateBio: (bio: string) =>
    usersBackend("me/profile/bio", Method.POST, { bio }),
};
