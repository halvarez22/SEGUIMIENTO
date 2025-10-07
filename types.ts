export interface ExtractedData {
  date: string;
  time: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
}

export interface HistoryEntry {
  id: string;
  data: ExtractedData;
  imagePreview: string;
  timestamp: string;
}

export interface ImageDataSource {
  mimeType: string;
  data: string;
}