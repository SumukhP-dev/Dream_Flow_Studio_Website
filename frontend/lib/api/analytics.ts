import apiClient from "./client";

export interface AnalyticsData {
  totalStories: number;
  totalViews: number;
  averageStoryLength: number;
  storiesWithMedia: number;
  popularThemes: Array<{ theme: string; count: number }>;
  usageByDate: Array<{ date: string; count: number }>;
  mediaGeneration: {
    videoSuccessRate: number;
    audioSuccessRate: number;
    totalVideoAttempts: number;
    successfulVideos: number;
    totalAudioAttempts: number;
    successfulAudios: number;
  };
  averageGenerationTime: number;
  exportStats: {
    totalExports: number;
    exportsByFormat: {
      pdf: number;
      markdown: number;
      json: number;
    };
  };
  recentActivity: {
    last7Days: number;
    last30Days: number;
  };
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
}

export const analyticsApi = {
  // Get analytics data with optional date range
  getAnalytics: async (startDate?: string, endDate?: string): Promise<AnalyticsData> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = queryString ? `/analytics?${queryString}` : '/analytics';
    
    const response = await apiClient.get<{ success: boolean; analytics: AnalyticsData }>(url);
    return response.data.analytics;
  },

  // Get story analytics
  getStoryAnalytics: async (storyId: string): Promise<any> => {
    const response = await apiClient.get(`/analytics/story/${storyId}`);
    return response.data;
  },
};


