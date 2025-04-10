import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: "https://chatty-app-backend-5cil.onrender.com/api",
  withCredentials: true, // ✅ Important for cookie-based auth
});
