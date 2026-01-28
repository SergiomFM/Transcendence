"use strict";

const path = require("node:path");
const AutoLoad = require("@fastify/autoload");

// Pass --options via CLI arguments in command to enable these options.
const options = {};

module.exports = async function (fastify, opts) {
  // Load game constants from GLB file at startup
  const { loadConstantsFromGLB } = require("./src/constants");
  await loadConstantsFromGLB();

  // Place here your custom code!

  // Register CORS for frontend communication
  fastify.register(require("@fastify/cors"), {
    origin: true, // Allow all origins in development
    credentials: true,
  });

  // Register WebSocket support for multiplayer Pong
  fastify.register(require("@fastify/websocket"));

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
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "routes"),
    options: Object.assign({}, opts),
  });
};

module.exports.options = options;
