const isBrowser = typeof window !== "undefined";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const fallbackHost = new URL(siteUrl).host;
const host = isBrowser ? window.location.host : fallbackHost;
const httpProtocol = isBrowser ? window.location.protocol : new URL(siteUrl).protocol;
const wsProtocol = isBrowser && window.location.protocol === "https:" ? "wss:" : "ws:";

export const USERS_BACKEND_URL = `${httpProtocol}//${host}/api/users`;
export const GAME_BACKEND_URL = `${httpProtocol}//${host}/api/game`;
export const GAME_WS_URL = `${wsProtocol}//${host}/ws/pong`;
export const LOBBY_WS_URL = `${wsProtocol}//${host}/ws/lobby`;
export const GAME_HTTP_URL = `${httpProtocol}//${host}/api/game`;
export const CHAT_BACKEND_URL = `${httpProtocol}//${host}/api/chat`;
