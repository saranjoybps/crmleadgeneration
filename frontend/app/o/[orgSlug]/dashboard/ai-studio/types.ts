export type ContentType = "blog" | "poster" | "social" | "email";
export type ContentStatus = "draft" | "scheduled" | "published" | "archived";
export type Platform = "linkedin" | "twitter" | "instagram" | "facebook" | "internal" | "email";

export type StudioContent = {
  id: string;
  title: string;
  type: ContentType;
  status: ContentStatus;
  platforms: Platform[];
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  body?: string;
  imageUrl?: string;
  socialText?: string;
  emailSubject?: string;
  tags: string[];
  bgColor?: string;
  textColor?: string;
  posterText?: string;
};

export type PosterTemplate = {
  id: string;
  name: string;
  background: string;
  textColor: string;
  accent: string;
};

export type AIGenerationType = "blog" | "social" | "email" | "hashtags" | "tagline";
