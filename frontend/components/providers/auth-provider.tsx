"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Users, type User } from "@/lib/backend";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
    alias: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const userData = await Users.dashboard();
      setUser(userData);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshUser().finally(() => {
      if (mounted) setIsLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const login = async (identifier: string, password: string) => {
    const response = await Users.login({ identifier, password });
    if (response.data.twoFactorRequired) {
      throw new Error("2FA_REQUIRED");
    }
    setUser(response.data.user);
  };

  const register = async (
    username: string,
    email: string,
    password: string,
    alias: string,
  ) => {
    const response = await Users.register({ username, email, password, alias });
    setUser(response.data.user);
  };

  const logout = async () => {
    try {
      await Users.logout();
    } catch {}
    setUser(null);
    router.replace("/auth");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
