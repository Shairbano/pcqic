/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext, useEffect } from "react";
import authService from "../services/authService";
import Loading from "../components/ui/Loading";

const UserContext = createContext();
const storage = sessionStorage;

const AuthContext = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      const timer = new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        const token = storage.getItem("token");
        if (!token) {
          await timer;
          setUser(null);
          setLoading(false);
          return;
        }
        const [response] = await Promise.all([authService.verify(), timer]);
        if (response.data.success) {
          setUser(response.data.user);
        } else {
          storage.removeItem("token");
          setUser(null);
        }
      } catch (err) {
        console.error("User verification failed", err);
        if (err?.response?.status === 401) {
          storage.removeItem("token");
        }
        await timer;
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    verifyUser();
  }, []);

  const login = (userData, token) => {
    if (token) storage.setItem("token", token);
    setUser(userData);
  };

  const logout = () => {
    authService.logout().catch(() => {});
    setUser(null);
    storage.removeItem("token");
  };

  return (
    <UserContext.Provider value={{ user, login, logout, loading }}>
      {loading ? <Loading /> : children}
    </UserContext.Provider>
  );
};

export const useAuth = () => useContext(UserContext);
export default AuthContext;