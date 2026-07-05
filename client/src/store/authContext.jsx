import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Preia datele userului logat din cookie-ul existent
  // Endpoint corect: GET /auth/profile
  const fetchMe = async () => {
    try {
      const response = await api.get("/auth/profile");
      setUser(response.data.data); // raspunsul are forma { data: { id, first_name, last_name, email, role } }
    } catch (error) {
      setUser(null); // cookie invalid sau expirat => user neautentificat
    } finally {
      setLoading(false);
    }
  };

  // Login: POST /auth/login => seteaza cookie httpOnly => apoi preia datele userului
  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    // dupa login reusit, populam userul din context prin fetchMe
    await fetchMe();
    return response.data; // returnam raspunsul pentru a putea face redirect in pagina
  };

  // Register: POST /auth/register => cont nou, fara autologin
  const register = async (first_name, last_name, email, password) => {
    const response = await api.post("/auth/register", {
      first_name,
      last_name,
      email,
      password,
    });
    return response.data;
  };

  // Logout: POST /auth/logout => backend sterge cookie => resetam starea locala
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      // chiar daca apelul esueaza, resetam starea locala
      console.error("Logout error:", error);
    } finally {
      setUser(null);
    }
  };

  // Actualizeaza datele userului in context dupa editare profil
  // Evita un re-fetch complet catre server
  const updateUser = (updatedData) => {
    setUser((prev) => ({ ...prev, ...updatedData }));
  };

  // La montarea aplicatiei, verifica daca exista un cookie valid
  useEffect(() => {
    fetchMe();
  }, []);

  // Memoizare pentru a evita re-render-uri inutile
  const value = useMemo(
    () => ({ user, loading, login, register, logout, fetchMe, updateUser }),
    [user, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook custom pentru acces usor la context
export function useAuth() {
  return useContext(AuthContext);
}