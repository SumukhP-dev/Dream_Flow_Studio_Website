import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../api/client";

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const authService = {
  // Login
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/auth/login", {
      email,
      password,
    });
    await AsyncStorage.setItem("auth_token", response.data.token);
    await AsyncStorage.setItem("user", JSON.stringify(response.data.user));
    return response.data;
  },

  // Signup
  signup: async (
    email: string,
    password: string,
    name?: string
  ): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/auth/signup", {
      email,
      password,
      name,
    });
    await AsyncStorage.setItem("auth_token", response.data.token);
    await AsyncStorage.setItem("user", JSON.stringify(response.data.user));
    return response.data;
  },

  // Logout
  logout: async (): Promise<void> => {
    await AsyncStorage.removeItem("auth_token");
    await AsyncStorage.removeItem("user");
  },

  // Get current user
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  // Check if authenticated
  isAuthenticated: async (): Promise<boolean> => {
    const token = await AsyncStorage.getItem("auth_token");
    return !!token;
  },
};


