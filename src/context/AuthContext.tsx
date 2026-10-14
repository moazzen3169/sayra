"use client";

import React, { createContext, useContext, useState } from "react";

export interface UserProfile {
  fullName: string;
  phone: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: UserProfile | null;
  login: (fullName: string, phone: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  login: () => {},
  logout: () => {},
});

const AUTH_STORAGE_KEY = "sayra_user_auth";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.fullName && parsed.phone) {
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
    return null;
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => !!user);

  const login = (fullName: string, phone: string) => {
    const newUser = { fullName, phone };
    setUser(newUser);
    setIsLoggedIn(true);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
    } catch {
      // Ignore storage error
    }
  };

  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Ignore storage error
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
