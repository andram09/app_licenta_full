import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const response = await api.get("/auth/me"); //cookie valid(logat)=>200; nu exista cookie(nu e logat)=> 401
      setUser(response.data.data); //user e în response.data.data
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const value = useMemo(() => ({ //re-rander doar la schimbari
    user,
    setUser,
    loading,
    refreshUser
  }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

//custom hook
export function useAuth() {
  return useContext(AuthContext);
}