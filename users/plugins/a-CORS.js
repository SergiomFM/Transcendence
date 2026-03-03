"use strict";

const fp = require("fastify-plugin");
const cors = require("@fastify/cors");

module.exports = fp(async function (fastify, opts) {
	await fastify.register(cors, {
		origin: true,
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	});
});
