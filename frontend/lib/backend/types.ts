export type User = {
  id: string;
  username: string;
  email: string;
  alias: string;
  role: string;
  two_factor_enabled?: number;
  google_id?: string | null;
};

export type PlayerProfile = {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};
