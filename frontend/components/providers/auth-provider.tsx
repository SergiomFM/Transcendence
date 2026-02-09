"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Auth, type User } from "@/lib/backend";

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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const userData = await Auth.dashboard();
      setUser(userData);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refreshUser().finally(() => {
      setIsLoading(false);
    });
  }, []);

  const login = async (identifier: string, password: string) => {
    const response = await Auth.login({ identifier, password });
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
    const response = await Auth.register({ username, email, password, alias });
    setUser(response.data.user);
  };

  const logout = async () => {
    try {
      await Auth.logout();
    } catch {}
    setUser(null);
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
