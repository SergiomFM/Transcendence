import { USERS_BACKEND_URL } from "./config";
import { usersBackend, Method } from "./request";
import type { User } from "./types";

export type AuthResponse = {
  message: string;
  user: User;
  twoFactorRequired?: boolean;
};

export type DashboardResponse = {
  message: string;
  user: User;
};

export const Auth = {
  login: (data: { identifier: string; password: string }) =>
    usersBackend<AuthResponse>("auth/login", Method.POST, data),

  register: (data: {
    username: string;
    email: string;
    password: string;
    alias: string;
  }) => usersBackend<AuthResponse>("auth/register", Method.POST, data),

  dashboard: () =>
    usersBackend<DashboardResponse>("dashboard", Method.GET).then(
      (response) => response.data.user,
    ),

  logout: () => Promise.resolve(),

  avatarUrl: (userId: string) =>
    userId ? `${USERS_BACKEND_URL}/users/${userId}/avatar` : "",
};
