import { USERS_BACKEND_URL } from "./config";
import { usersBackend, Method } from "./request";
import type { User } from "./types";

export const Users = {
  login: (data: { identifier: string; password: string }) =>
    usersBackend<{ message: string; user: User; twoFactorRequired?: boolean }>(
      "auth/login",
      Method.POST,
      data,
    ),

  register: (data: {
    username: string;
    email: string;
    password: string;
    alias: string;
  }) =>
    usersBackend<{ message: string; user: User }>(
      "auth/register",
      Method.POST,
      data,
    ),

  dashboard: () =>
    usersBackend<{ message: string; user: User }>("dashboard", Method.GET).then(
      (response) => response.data.user,
    ),

  logout: () => usersBackend("auth/logout", Method.GET),

  avatarUrl: (userId: string) =>
    userId ? `${USERS_BACKEND_URL}/users/${userId}/avatar` : "",

  googleOAuthUrl: () => `${USERS_BACKEND_URL}/auth/google`,

  // TODO: endpoint POST /me/password not yet implemented on backend
  changePassword: (currentPassword: string, newPassword: string) =>
    usersBackend("me/password", Method.POST, { currentPassword, newPassword }),

  setup2FA: () =>
    usersBackend<{ message: string; qr: string; otpauth_url: string }>(
      "auth/2fa/setup",
      Method.POST,
    ),

  confirm2FA: (token: string) =>
    usersBackend<{ message: string; recovery_codes: string[] }>(
      "auth/2fa/confirm",
      Method.POST,
      { token },
    ),

  verify2FA: (token: string) =>
    usersBackend("auth/2fa/verify", Method.POST, { token }),
};
