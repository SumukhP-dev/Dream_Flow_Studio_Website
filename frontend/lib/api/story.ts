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
    const response = await apiClient.post<{ success: boolean; story: Story }>("/story", params);
    return response.data.story;
  },

  // Get story history
  getHistory: async (): Promise<Story[]> => {
    const response = await apiClient.get<{ success: boolean; stories: Story[] }>("/story/history");
    return response.data.stories;
  },

  // Get specific story
  getById: async (id: string): Promise<Story> => {
    const response = await apiClient.get<{ success: boolean; story: Story }>(`/story/${id}`);
    return response.data.story;
  },

  // Update story
  update: async (id: string, updates: Partial<Story>): Promise<Story> => {
    const response = await apiClient.put<{ success: boolean; story: Story }>(`/story/${id}`, updates);
    return response.data.story;
  },

  // Delete story
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/story/${id}`);
  },
};


