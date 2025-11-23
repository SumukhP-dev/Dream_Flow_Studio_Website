import apiClient from "./client";

export interface Story {
  id: string;
  title: string;
  content: string;
  theme: string;
  parameters: Record<string, any>;
  videoUrl?: string;
  audioUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoryGenerationParams {
  prompt: string;
  theme?: string;
  parameters?: Record<string, any>;
  generateVideo?: boolean;
  generateAudio?: boolean;
}

export const storyApi = {
  // Generate new story
  generate: async (params: StoryGenerationParams): Promise<Story> => {
    const response = await apiClient.post<Story>("/story", params);
    return response.data;
  },

  // Get story history
  getHistory: async (): Promise<Story[]> => {
    const response = await apiClient.get<Story[]>("/story/history");
    return response.data;
  },

  // Get specific story
  getById: async (id: string): Promise<Story> => {
    const response = await apiClient.get<Story>(`/story/${id}`);
    return response.data;
  },

  // Update story
  update: async (id: string, updates: Partial<Story>): Promise<Story> => {
    const response = await apiClient.put<Story>(`/story/${id}`, updates);
    return response.data;
  },

  // Delete story
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/story/${id}`);
  },
};


