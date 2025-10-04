import { createContext, useContext, useReducer, useCallback } from "react";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const AuthContext = createContext();

const BASE_URL = "https://chatty-app-backend-5cil.onrender.com";

const authReducer = (state, action) => {
  switch (action.type) {
    case "SET_AUTH_USER":
      return { ...state, authUser: action.payload };
    case "SET_LOADING":
      return { ...state, [action.payload.key]: action.payload.value };
    case "SET_ONLINE_USERS":
      return { ...state, onlineUsers: action.payload };
    case "SET_SOCKET":
      return { ...state, socket: action.payload };
    case "CLEAR_AUTH":
      return { ...state, authUser: null, socket: null };
    default:
      return state;
  }
};

const initialState = {
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const checkAuth = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      dispatch({ type: "SET_AUTH_USER", payload: res.data });
      connectSocket();
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error("Error in checkAuth:", error);
      }
      dispatch({ type: "SET_AUTH_USER", payload: null });
    } finally {
      dispatch({
        type: "SET_LOADING",
        payload: { key: "isCheckingAuth", value: false },
      });
    }
  }, []);

  const signup = useCallback(async (data) => {
    dispatch({
      type: "SET_LOADING",
      payload: { key: "isSigningUp", value: true },
    });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      dispatch({ type: "SET_AUTH_USER", payload: res.data });
      toast.success("Account created successfully");
      connectSocket();
    } catch (error) {
      console.error("Error in signup:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to create account");
      }
    } finally {
      dispatch({
        type: "SET_LOADING",
        payload: { key: "isSigningUp", value: false },
      });
    }
  }, []);

  const login = useCallback(async (data) => {
    dispatch({
      type: "SET_LOADING",
      payload: { key: "isLoggingIn", value: true },
    });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      dispatch({ type: "SET_AUTH_USER", payload: res.data });
      toast.success("Logged in successfully");
      connectSocket();
    } catch (error) {
      console.error("Error in login:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to login");
      }
    } finally {
      dispatch({
        type: "SET_LOADING",
        payload: { key: "isLoggingIn", value: false },
      });
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await axiosInstance.post("/auth/logout");
      dispatch({ type: "CLEAR_AUTH" });
      toast.success("Logged out successfully");
      disconnectSocket();
    } catch (error) {
      console.error("Error in logout:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to logout");
      }
    }
  }, []);

  const updateProfile = useCallback(async (data) => {
    dispatch({
      type: "SET_LOADING",
      payload: { key: "isUpdatingProfile", value: true },
    });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      dispatch({ type: "SET_AUTH_USER", payload: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error in update profile:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to update profile");
      }
    } finally {
      dispatch({
        type: "SET_LOADING",
        payload: { key: "isUpdatingProfile", value: false },
      });
    }
  }, []);

  const connectSocket = () => {
    if (!state.authUser || state.socket?.connected) return;

    const socket = io(BASE_URL, {
      query: {
        userId: state.authUser._id,
      },
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    socket.connect();

    dispatch({ type: "SET_SOCKET", payload: socket });

    socket.on("getOnlineUsers", (userIds) => {
      dispatch({ type: "SET_ONLINE_USERS", payload: userIds });
    });
  };

  const disconnectSocket = () => {
    if (state.socket?.connected) state.socket.disconnect();
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        checkAuth,
        signup,
        login,
        logout,
        updateProfile,
        connectSocket,
        disconnectSocket,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
