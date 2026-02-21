"use strict";

const path = require("node:path");
const AutoLoad = require("@fastify/autoload");
const Fastify = require("fastify");

// Pass --options via CLI arguments in command to enable these options.
const options = {};

module.exports = async function (fastify, opts) {
  // Load game constants from GLB file at startup
  const { loadConstantsFromGLB } = require("./src/constants");
  await loadConstantsFromGLB();

  // Place here your custom code!

  // Register CORS for frontend communication
  fastify.register(require("@fastify/cors"), {
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  });

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "plugins"),
    options: Object.assign({}, opts),
  });

  // This loads all plugins defined in routes
  // define your routes in one of these
  // (excludes pong/ which is handled by the WS server)
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "routes"),
    ignorePattern: /pong/,
    options: Object.assign({}, opts),
  });

  // Start the separate WebSocket server for Pong
  const wsPort = parseInt(process.env.GAME_WS_PORT || "3001", 10);
  const wsServer = Fastify({ logger: { level: "warn" } });

  wsServer.register(require("@fastify/cors"), {
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  });

  wsServer.register(require("@fastify/websocket"));

  // Load pong routes on the WS server
  wsServer.register(require("./routes/pong/index.js"), { prefix: "/" });

  fastify.addHook("onReady", async () => {
    await wsServer.listen({ port: wsPort, host: "0.0.0.0" });
    fastify.log.info(`Game WebSocket server listening on port ${wsPort}`);
  });

  fastify.addHook("onClose", async () => {
    await wsServer.close();
  });
};

module.exports.options = options;
