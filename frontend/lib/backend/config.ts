const isBrowser = typeof window !== "undefined";
const hostname = isBrowser ? window.location.hostname : "localhost";
const host = isBrowser ? window.location.host : "localhost";
const httpProtocol = isBrowser ? window.location.protocol : "http:";
const wsProtocol = isBrowser && window.location.protocol === "https:" ? "wss:" : "ws:";
export const USERS_BACKEND_URL = `${httpProtocol}//${hostname}:3001`;

export const GAME_BACKEND_URL = `${httpProtocol}//${hostname}:3002`;

export const GAME_WS_URL = `${wsProtocol}//${hostname}:3002/pong`;

export const GAME_HTTP_URL = `${httpProtocol}//${hostname}:3002`;
