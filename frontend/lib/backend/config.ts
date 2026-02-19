const isBrowser = typeof window !== "undefined";
const host = isBrowser ? window.location.host : "localhost:3000";
const httpProtocol = isBrowser ? window.location.protocol : "http:";
const wsProtocol = isBrowser && window.location.protocol === "https:" ? "wss:" : "ws:";

export const USERS_BACKEND_URL = `${httpProtocol}//${host}/api/users`;
export const GAME_BACKEND_URL = `${httpProtocol}//${host}/api/game`;
export const GAME_WS_URL = `${wsProtocol}//${host}/ws/pong`;
export const GAME_HTTP_URL = `${httpProtocol}//${host}/api/game`;
