import axios from "axios";

const apiurl =
  (process.env.REACT_APP_API_URL || process.env.REACT_APP_URL || "http://localhost:8000") +
  "/api";

const axiosInstance = axios.create({
  baseURL: apiurl,
  withCredentials: true,
});

export default axiosInstance