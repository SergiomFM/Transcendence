import type { FastifyRequest, FastifyReply } from "fastify";

const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || "http://users-dev:3000";

interface VerifyAuthResponse {
  username: string | null;
  alias?: string;
  id?: string;
  email?: string;
}

/**
 * Verify user authentication by calling the users service
 * Forwards the session cookies from the incoming request
 */
export async function verifyAuth(request: FastifyRequest): Promise<VerifyAuthResponse | null> {
  try {
    const cookies = request.headers.cookie;
    
    console.log("[auth] Verifying with users service...");
    console.log("[auth] Cookies:", cookies ? cookies.substring(0, 50) + "..." : "none");

    const response = await fetch(`${USERS_SERVICE_URL}/auth/verify_auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookies && { Cookie: cookies }), // Forward session cookies
      },
      credentials: "include", // Include credentials in the request
      body: JSON.stringify({}), // Send empty body
    });

    console.log("[auth] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[auth] Verification failed with status ${response.status}:`, errorText);
      return null;
    }

    const data = (await response.json()) as VerifyAuthResponse;
    console.log("[auth] Verification successful for user:", data.username || data.alias);
    return data;
  } catch (error) {
    console.error("[auth] Error verifying with users service:", error);
    return null;
  }
}

/**
 * Fastify hook to verify authentication on protected routes
 * Usage: fastify.addHook('preHandler', verifyAuthHook)
 */
export async function verifyAuthHook(request: FastifyRequest, reply: FastifyReply) {
  const authData = await verifyAuth(request);

  if (!authData) {
    return reply.code(401).send({ error: "Unauthorized - authentication failed" });
  }

  // Use username if available, fallback to alias (for Google OAuth users)
  const username = authData.username || authData.alias;
  
  if (!username) {
    return reply.code(401).send({ error: "Unauthorized - no username or alias available" });
  }

  // Attach verified user data to the request
  (request as any).user = {
    ...authData,
    username, // Ensure username is always set
  };
  (request as any).userId = authData.id || username;
}
