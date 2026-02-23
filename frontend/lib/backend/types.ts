export type User = {
  id: string;
  username: string;
  email: string;
  alias: string;
  role: string;
  avatar?: string | null;
  two_factor_enabled?: number;
  google_id?: string | null;
};

export type PlayerProfile = {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  wins: number;
  losses: number;
  created_at: string;
  updated_at: string;
};

export type FriendRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
  // Joined from player_profiles of the sender
  display_name: string;
  avatar_url: string | null;
};

export type Friend = {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type PlayerSearchResult = {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type MatchRecord = {
  id: number;
  player1_id: string | null;
  player2_id: string | null;
  player1_score: number;
  player2_score: number;
  winner_id: string | null;
  played_at: string;
  player1_display_name: string | null;
  player1_avatar_url: string | null;
  player2_display_name: string | null;
  player2_avatar_url: string | null;
};
