"use strict";

const fp = require("fastify-plugin");
const cors = require("@fastify/cors");

module.exports = fp(async function (fastify, opts) {
	await fastify.register(cors, {
		origin: process.env.FRONTEND_URL || "http://localhost:3000",
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	});
});
