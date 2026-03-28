export interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  // Prompt generation
  prompt: string;
  editedPrompt: string;
  // Image generation result
  generatedImageUrl?: string;
  generatedMimeType?: string;
  // Status tracking
  status: ImageStatus;
  error?: string;
}

export type ImageStatus =
  | "idle"
  | "generating-prompt"
  | "prompt-ready"
  | "generating-image"
  | "done"
  | "error";

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
}
