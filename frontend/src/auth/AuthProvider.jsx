import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import * as authApi from "../api/auth.api.js";
import { setAccessToken } from "../api/client.js";

const AuthContext = createContext(null);
let bootstrapRefreshPromise = null;

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const initialPathRef = useRef(pathname);

  const handleSession = (session) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
    setIsAuthenticated(true);
  };

  const signIn = async (payload) => {
    const session = await authApi.login(payload);
    handleSession(session);
    navigate("/app/dashboard");
  };

  const signUp = async (payload) => {
    const session = await authApi.signup(payload);
    handleSession(session);
    navigate("/app/dashboard");
  };

  const signOut = async () => {
    await authApi.logout();
    setAccessToken(null);
    setUser(null);
    setIsAuthenticated(false);
    navigate("/login");
  };

  useEffect(() => {
    let active = true;
    const isPasswordResetRoute =
      initialPathRef.current === "/forgot-password" || initialPathRef.current.startsWith("/reset-password/");

    if (isPasswordResetRoute) {
      setAccessToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setIsBootstrapping(false);
      return () => {
        active = false;
      };
    }

    bootstrapRefreshPromise = bootstrapRefreshPromise || authApi.refresh();

    bootstrapRefreshPromise
      .then((session) => {
        if (active) {
          handleSession(session);
        }
      })
      .catch(() => {
        setAccessToken(null);
        setUser(null);
        setIsAuthenticated(false);
      })
      .finally(() => {
        bootstrapRefreshPromise = null;
        if (active) {
          setIsBootstrapping(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated, isBootstrapping, signIn, signUp, signOut }),
    [user, isAuthenticated, isBootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
