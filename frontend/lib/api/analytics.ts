import apiClient from "./client";

export interface AnalyticsData {
  totalStories: number;
  totalViews: number;
  averageGenerationTime: number;
  popularThemes: Array<{ theme: string; count: number }>;
  usageByDate: Array<{ date: string; count: number }>;
}

export const analyticsApi = {
  // Get analytics data
  getAnalytics: async (): Promise<AnalyticsData> => {
    const response = await apiClient.get<AnalyticsData>("/analytics");
    return response.data;
  },

  // Get story analytics
  getStoryAnalytics: async (storyId: string): Promise<any> => {
    const response = await apiClient.get(`/analytics/story/${storyId}`);
    return response.data;
  },
};


