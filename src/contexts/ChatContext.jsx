import { createContext, useContext, useReducer, useCallback } from "react";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuth } from "./AuthContext";

const ChatContext = createContext();

const chatReducer = (state, action) => {
  switch (action.type) {
    case "SET_MESSAGES":
      return { ...state, messages: action.payload };
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.payload] };
    case "SET_USERS":
      return { ...state, users: action.payload };
    case "SET_SELECTED_USER":
      return { ...state, selectedUser: action.payload };
    case "SET_LOADING":
      return { ...state, [action.payload.key]: action.payload.value };
    default:
      return state;
  }
};

const initialState = {
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
};

export const ChatProvider = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { socket } = useAuth();

  const getUsers = useCallback(async () => {
    dispatch({
      type: "SET_LOADING",
      payload: { key: "isUsersLoading", value: true },
    });
    try {
      const res = await axiosInstance.get("/messages/users");
      dispatch({ type: "SET_USERS", payload: res.data });
    } catch (error) {
      console.error("Error fetching users:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to fetch users");
      }
    } finally {
      dispatch({
        type: "SET_LOADING",
        payload: { key: "isUsersLoading", value: false },
      });
    }
  }, []);

  const getMessages = useCallback(async (userId) => {
    dispatch({
      type: "SET_LOADING",
      payload: { key: "isMessagesLoading", value: true },
    });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      dispatch({ type: "SET_MESSAGES", payload: res.data });
    } catch (error) {
      console.error("Error fetching messages:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to fetch messages");
      }
    } finally {
      dispatch({
        type: "SET_LOADING",
        payload: { key: "isMessagesLoading", value: false },
      });
    }
  }, []);

  const sendMessage = useCallback(
    async (messageData) => {
      if (!state.selectedUser) {
        toast.error("No user selected");
        return;
      }

      try {
        const res = await axiosInstance.post(
          `/messages/send/${state.selectedUser._id}`,
          messageData
        );
        dispatch({ type: "ADD_MESSAGE", payload: res.data });
      } catch (error) {
        console.error("Error sending message:", error);
        if (error.response?.data?.message) {
          toast.error(error.response.data.message);
        } else {
          toast.error("Failed to send message");
        }
      }
    },
    [state.selectedUser]
  );

  const subscribeToMessages = useCallback(() => {
    if (!state.selectedUser || !socket) return;

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser =
        newMessage.senderId === state.selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      dispatch({ type: "ADD_MESSAGE", payload: newMessage });
    });
  }, [state.selectedUser, socket]);

  const unsubscribeFromMessages = useCallback(() => {
    if (socket) {
      socket.off("newMessage");
    }
  }, [socket]);

  const setSelectedUser = useCallback((selectedUser) => {
    dispatch({ type: "SET_SELECTED_USER", payload: selectedUser });
  }, []);

  return (
    <ChatContext.Provider
      value={{
        ...state,
        getUsers,
        getMessages,
        sendMessage,
        subscribeToMessages,
        unsubscribeFromMessages,
        setSelectedUser,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
