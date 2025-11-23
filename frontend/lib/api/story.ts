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

  // Get story history with pagination and filters
  getHistory: async (options?: {
    page?: number;
    limit?: number;
    theme?: string;
    search?: string;
    sortBy?: 'createdAt' | 'updatedAt' | 'title';
    sortOrder?: 'asc' | 'desc';
    hasVideo?: boolean;
    hasAudio?: boolean;
  }): Promise<{
    stories: Story[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> => {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.theme) params.append('theme', options.theme);
    if (options?.search) params.append('search', options.search);
    if (options?.sortBy) params.append('sortBy', options.sortBy);
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder);
    if (options?.hasVideo !== undefined) params.append('hasVideo', options.hasVideo.toString());
    if (options?.hasAudio !== undefined) params.append('hasAudio', options.hasAudio.toString());

    const queryString = params.toString();
    const url = queryString ? `/story/history?${queryString}` : '/story/history';
    
    const response = await apiClient.get<{
      success: boolean;
      stories: Story[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(url);
    return {
      stories: response.data.stories,
      pagination: response.data.pagination,
    };
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

  // Export story
  export: async (
    id: string,
    format: 'pdf' | 'markdown' | 'json',
    options?: { includeMetadata?: boolean; includeMediaLinks?: boolean }
  ): Promise<Blob> => {
    const params = new URLSearchParams({
      format,
      includeMetadata: options?.includeMetadata?.toString() || 'true',
      includeMediaLinks: options?.includeMediaLinks?.toString() || 'true',
    });

    const response = await apiClient.get(`/story/${id}/export?${params.toString()}`, {
      responseType: 'blob',
    });

    return response.data;
  },

  // Get media status
  getMediaStatus: async (id: string): Promise<{ video: string; audio: string }> => {
    const response = await apiClient.get<{ success: boolean; status: { video: string; audio: string } }>(`/story/${id}/media/status`);
    return response.data.status;
  },

  // Regenerate media
  regenerateMedia: async (id: string, type: 'video' | 'audio'): Promise<void> => {
    await apiClient.post(`/story/${id}/media/regenerate`, { type });
  },

  // Get media usage and limits
  getMediaUsage: async (): Promise<{
    video: { count: number; limit: number; remaining: number };
    audio: { count: number; limit: number; remaining: number };
  }> => {
    const response = await apiClient.get<{
      success: boolean;
      usage: {
        video: { count: number; limit: number; remaining: number };
        audio: { count: number; limit: number; remaining: number };
      };
    }>('/story/media/usage');
    return response.data.usage;
  },
};


