import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { Config } from "@/constants/Config";
import AsyncStorage from "@react-native-async-storage/async-storage";

const apiClient: AxiosInstance = axios.create({
  baseURL: Config.API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Add auth token interceptor
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error getting auth token:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - clear token and redirect to login
      await AsyncStorage.removeItem("auth_token");
    }
    return Promise.reject(error);
  }
);

export default apiClient;


