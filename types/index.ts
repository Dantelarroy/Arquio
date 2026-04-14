export interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  aspectRatio?: string; // e.g. "9:16", "3:4", "1:1", "4:3", "16:9"
  // Prompt generation
  prompt: string;
  editedPrompt: string;
  // Image generation result
  generatedImageUrl?: string;
  generatedMimeType?: string;
  // Status tracking
  status: ImageStatus;
  error?: string;
  errorStage?: ImageErrorStage;
}

export type ImageStatus =
  | "idle"
  | "generating-prompt"
  | "prompt-ready"
  | "generating-image"
  | "done"
  | "error";

export type ImageErrorStage = "prompt" | "image";

export type AppStep = "upload" | "prompts" | "results";

export interface GeneratePromptRequest {
  imageBase64: string;
  mimeType: string;
  masterPrompt: string;
}

export interface GeneratePromptResponse {
  prompt: string;
  error?: string;
}

export interface GenerateImageRequest {
  prompt: string;
  imageBase64: string;
  mimeType: string;
}

export interface GenerateImageResponse {
  imageBase64: string;
  mimeType: string;
  error?: string;
  code?: string;
}
