export async function processVideoWithCanvas(
  videoFile: File,
  text: string,
  options: {
    color?: string;
    opacity?: number;
    fontSize?: number;
    layout?: 'single' | 'tiled';
  },
  onProgress?: (msg: string) => void
): Promise<{ blob: Blob; ext: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    onProgress?.("Preparing video canvas...");
    const video = document.createElement("video");
    const videoUrl = URL.createObjectURL(videoFile);
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    // Mute is often required for programmatic playback without user interaction constraints
    video.muted = true;
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
      const anyVideo = video as any;
      const captureStream = anyVideo.captureStream || anyVideo.mozCaptureStream;
      
      let videoStream: MediaStream | null = null;
      if (captureStream) {
        videoStream = captureStream.call(video);
        const audioTracks = videoStream?.getAudioTracks();
        if (audioTracks && audioTracks.length > 0) {
          audioTrack = audioTracks[0];
        }
      }

      // Capture the canvas visual stream at 30 FPS
      const canvasStream = canvas.captureStream(30);
      const tracks = [canvasStream.getVideoTracks()[0]];
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
      
      const recorder = new MediaRecorder(combinedStream, { mimeType });
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
          
          // Draw the current video frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Apply watermark styling
          ctx.fillStyle = options.color || "#FFFFFF";
          ctx.globalAlpha = options.opacity || 0.5;
          
          // Make font size responsive to video resolution
          const baseSize = options.fontSize || 40;
          const responsiveSize = Math.max(20, (canvas.height / 1080) * baseSize * 2);
          ctx.font = `bold ${responsiveSize}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          
          if (options.layout === "single") {
            ctx.fillText(text, canvas.width / 2, canvas.height / 2);
          } else {
            // Tiled layout pattern
            const cols = 3;
            const rows = 5;
            for (let i = 1; i <= cols; i++) {
              for (let j = 1; j <= rows; j++) {
                 ctx.save();
                 ctx.translate(canvas.width * (i / (cols + 1)), canvas.height * (j / (rows + 1)));
                 ctx.rotate(-Math.PI / 6); // slight rotation for tiled effect
                 ctx.fillText(text, 0, 0);
                 ctx.restore();
              }
            }
          }
          
          ctx.globalAlpha = 1.0; // Reset alpha
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
