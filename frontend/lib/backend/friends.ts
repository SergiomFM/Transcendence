import { usersBackend, Method } from "./request";
import type { Friend, FriendRequest } from "./types";

export const Friends = {
  /** Send a friend request to another user */
  sendRequest: (receiverId: string) =>
    usersBackend("friends/request", Method.POST, { receiverId }),

  /** Cancel a sent friend request to a specific user */
  cancelRequest: (receiverId: string) =>
    usersBackend(`friends/request/${receiverId}`, Method.DELETE),

  /** Accept an incoming friend request by its id */
  acceptRequest: (requestId: string) =>
    usersBackend("friends/accept", Method.POST, { requestId }),

  /** Reject an incoming friend request by its id */
  rejectRequest: (requestId: string) =>
    usersBackend("friends/reject", Method.POST, { requestId }),

  /** List all accepted friends of the current user */
  list: () =>
    usersBackend<{ friends: Friend[] }>("friends", Method.GET),

  /** List all pending incoming friend requests for the current user */
  listRequests: () =>
    usersBackend<{ requests: FriendRequest[] }>("friends/requests", Method.GET),

  /** List all pending sent friend requests by the current user */
  listSentRequests: () =>
    usersBackend<{ requests: FriendRequest[] }>("friends/requests/sent", Method.GET),

  /** Remove a friend */
  remove: (friendId: string) =>
    usersBackend(`friends/${friendId}`, Method.DELETE),
};
