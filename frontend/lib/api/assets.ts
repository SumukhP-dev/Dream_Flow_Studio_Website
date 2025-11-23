import apiClient from "./client";

export interface Asset {
  id: string;
  type: "video" | "audio" | "image";
  url: string;
  thumbnailUrl?: string;
  name: string;
  size: number;
  createdAt: string;
}

export const assetsApi = {
  // Get video URL
  getVideoUrl: async (id: string): Promise<string> => {
    const response = await apiClient.get<{ url: string }>(`/assets/video/${id}`);
    return response.data.url;
  },

  // Get audio URL
  getAudioUrl: async (id: string): Promise<string> => {
    const response = await apiClient.get<{ url: string }>(`/assets/audio/${id}`);
    return response.data.url;
  },

  // Upload custom asset
  upload: async (
    file: FormData,
    onProgress?: (progress: number) => void
  ): Promise<Asset> => {
    const response = await apiClient.post<Asset>("/assets/upload", file, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(progress);
        }
      },
    });
    return response.data;
  },

  // Get all assets
  getAll: async (): Promise<Asset[]> => {
    const response = await apiClient.get<Asset[]>("/assets");
    return response.data;
  },

  // Delete asset
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/assets/${id}`);
  },
};


