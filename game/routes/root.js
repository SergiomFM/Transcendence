"use strict";

const { GAME_CONSTANTS } = require("../shared/constants");

module.exports = async function (fastify, opts) {
  fastify.get("/", async function (request, reply) {
    return { root: true };
  });

  // Endpoint to fetch game constants
  fastify.get("/constants", async function (request, reply) {
    return {
      success: true,
      constants: GAME_CONSTANTS,
    };
  });
};
