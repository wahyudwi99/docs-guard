import { registerPlugin } from '@capacitor/core';

export interface VideoWatermarkPlugin {
  /**
   * Applies a text watermark to a video using native AVFoundation.
   * @param options The configuration for the watermark.
   * @returns The file URI of the exported video.
   */
  addTextWatermark(options: {
    videoUri: string;
    text: string;
    colorHex?: string;
    fontSize?: number;
    opacity?: number;
    layout?: 'single' | 'tiled';
  }): Promise<{ uri: string }>;
  
  /**
   * Simple test to verify the native bridge is connected.
   */
  ping(): Promise<{ value: string }>;
}

export const VideoWatermark = registerPlugin<VideoWatermarkPlugin>('VideoWatermark');
