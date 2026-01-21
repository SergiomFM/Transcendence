const isLocalhost =
  typeof window !== "undefined" && window.location.hostname === "localhost";

export const USERS_BACKEND_URL = isLocalhost
  ? "http://localhost:3001"
  : "/api/users";

export const GAME_BACKEND_URL = isLocalhost
  ? "http://localhost:3002"
  : "/api/game";
