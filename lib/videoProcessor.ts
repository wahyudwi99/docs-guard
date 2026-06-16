import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { VideoWatermark } from './plugins/VideoWatermark';
import { applyWatermarkToContext } from './watermark_utils';

export async function processVideoWithCanvas(
  videoFile: File,
  text: string,
  options: {
    color?: string;
    opacity?: number;
    fontSize?: number;
    layout?: 'single' | 'tiled';
    orientation?: "horizontal" | "diagonal" | "vertical";
  },
  onProgress?: (msg: string) => void
): Promise<{ blob: Blob; ext: string; mimeType: string }> {
  
  // NATIVE ACCELERATED PATH (iOS/Android)
  if (Capacitor.isNativePlatform()) {
    try {
      onProgress?.("Utilizing native hardware acceleration...");
      
      // 1. Save File to temporary storage for native access
      const fileName = `temp_${Date.now()}_${videoFile.name}`;
      const arrayBuffer = await videoFile.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache
      });

      // 2. Call Native Plugin
      const result = await VideoWatermark.addTextWatermark({
        videoUri: savedFile.uri,
        text: text,
        colorHex: options.color || "#FFFFFF",
        fontSize: options.fontSize || 40,
        opacity: options.opacity || 0.5,
        layout: options.layout || 'tiled'
      });

      // 3. Read back the result
      const processedFile = await Filesystem.readFile({
        path: result.uri
      });

      // Cleanup temp input
      await Filesystem.deleteFile({
        path: fileName,
        directory: Directory.Cache
      });

      const mimeType = "video/mp4";
      const byteCharacters = atob(processedFile.data as string);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      return { blob, ext: 'mp4', mimeType };
    } catch (err) {
      console.warn("Native video processing failed, falling back to Canvas:", err);
      // Fall through to Canvas method
    }
  }

  return new Promise((resolve, reject) => {
    onProgress?.("Preparing video canvas...");
    const video = document.createElement("video");
    const videoUrl = URL.createObjectURL(videoFile);
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    // CRITICAL: Must be unmuted to capture audio track
    video.muted = false; 
    video.volume = 0; // Keep volume at 0 so user doesn't hear it during export
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        return reject(new Error("Could not get 2d context from canvas"));
      }

      onProgress?.("Initializing recorder...");
      
      // Attempt to capture the audio track from the original video
      let audioTrack: MediaStreamTrack | undefined;
      const customVideo = video as any;
      const captureStream = customVideo.captureStream || customVideo.mozCaptureStream;
      
      if (captureStream) {
        const stream = captureStream.call(video);
        audioTrack = stream.getAudioTracks()[0];
      }

      // Capture the canvas visual stream at 60 FPS for ultra-smooth output
      const canvasStream = canvas.captureStream(60);
      const videoTrack = canvasStream.getVideoTracks()[0];
      
      // Combine tracks: Canvas Video + Original Audio
      const tracks: MediaStreamTrack[] = [videoTrack];
      if (audioTrack) {
        tracks.push(audioTrack);
      }
      
      const combinedStream = new MediaStream(tracks);
      
      // Determine best supported mimeType for MediaRecorder
      let mimeType = "video/webm";
      let ext = "webm";
      if (MediaRecorder.isTypeSupported("video/mp4")) {
        // iOS Safari supports mp4
        mimeType = "video/mp4";
        ext = "mp4";
      } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
        mimeType = "video/webm;codecs=vp9";
      } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
        mimeType = "video/webm;codecs=vp8";
      }
      
      const recorder = new MediaRecorder(combinedStream, { 
        mimeType,
        videoBitsPerSecond: 30000000 // 30Mbps for 60FPS quality
      });
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        URL.revokeObjectURL(videoUrl);
        const blob = new Blob(chunks, { type: mimeType });
        resolve({ blob, ext, mimeType });
      };
      
      recorder.onerror = (e) => {
        URL.revokeObjectURL(videoUrl);
        reject(e);
      };

      video.onplay = () => {
        onProgress?.("Recording video with watermark in real-time...");
        recorder.start();
        
        const draw = () => {
          if (video.paused || video.ended) return;
          
          // 1. Draw the current video frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // 2. Use unified utility for perfect consistency with preview
          applyWatermarkToContext(ctx, canvas.width, canvas.height, {
            text,
            type: 'text',
            layout: options.layout || 'tiled',
            color: options.color || "#FFFFFF",
            opacity: options.opacity || 0.5,
            fontFamily: 'sans-serif',
            fontSize: options.fontSize || 40,
            orientation: options.orientation || "diagonal"
          });
          
          requestAnimationFrame(draw);
        };
        
        // Start the rendering loop
        draw();
      };
      
      video.onended = () => {
        onProgress?.("Finalizing video file...");
        recorder.stop();
      };

      // Start playing the video to trigger rendering and recording
      video.play().catch((err) => {
        URL.revokeObjectURL(videoUrl);
        reject(err);
      });
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(videoUrl);
      reject(new Error("Failed to load video source"));
    };
  });
}
