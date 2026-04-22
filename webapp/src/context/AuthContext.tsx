import { createContext, useState, useEffect, useMemo } from "react";
import axios from "axios";
import { API_URL } from "../config";

export const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: any) => {

  const [user, setUser] = useState(null);

  // comprobar si hay cookie válida
  const checkAuth = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/auth/me`, {
        withCredentials: true
      });

      setUser(res.data);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const logout = async () => {
    await axios.post(`${API_URL}/logout`, {}, {
      withCredentials: true
    });

    setUser(null);
  };

  const contextValue = useMemo(() => ({
    user,
    setUser,
    logout,
    checkAuth
  }), [user]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
