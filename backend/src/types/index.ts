export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Story {
  id: string;
  userId: string;
  title: string;
  content: string;
  theme: string;
  parameters: Record<string, any>;
  videoUrl?: string | null;
  audioUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset {
  id: string;
  userId: string;
  type: "video" | "audio" | "image";
  url: string;
  thumbnailUrl?: string | null;
  name: string;
  size: number;
  createdAt: Date;
}
