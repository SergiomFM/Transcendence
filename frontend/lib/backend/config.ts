const isLocalhost =
  typeof window !== "undefined" && window.location.hostname === "localhost";

const getHostname = () => {
  if (typeof window === "undefined") return "localhost";
  return window.location.hostname;
};

const getWsProtocol = () => {
  if (typeof window === "undefined") return "ws";
  return window.location.protocol === "https:" ? "wss" : "ws";
};

export const USERS_BACKEND_URL = isLocalhost
  ? "http://localhost:3001"
  : "/api/users";

export const GAME_BACKEND_URL = isLocalhost
  ? "http://localhost:3002"
  : "/api/game";

export const GAME_WS_URL = `${getWsProtocol()}://${getHostname()}:3002/pong`;

export const GAME_HTTP_URL = `${typeof window !== "undefined" ? window.location.protocol : "http:"}//${getHostname()}:3002`;
