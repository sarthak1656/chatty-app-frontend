import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: "https://chatty-app-backend-5cil.onrender.com/api", // your backend URL
  withCredentials: true,
});
