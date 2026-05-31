import { useCallback } from "react";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Media } from "@capacitor-community/media";
import { Capacitor } from "@capacitor/core";
import { isCapacitorApp, saveAndOpenBlob } from "@/lib/utils";
import { jsPDF, jsPDFOptions } from "jspdf";

interface UseFileExportProps {
  canvases: HTMLCanvasElement[];
  watermarkText: string;
  documentType: "image" | "pdf" | "video" | null;
  password?: string;
  isPro?: boolean;
  metadataOptions?: {
    stripAuthor: boolean;
    stripCreationDate: boolean;
    stripGPS: boolean;
    nuclearClean: boolean;
  };
  file?: File | null;
  videoRef?: React.MutableRefObject<HTMLVideoElement | null>;
}

export function useFileExport({ 
  canvases, 
  watermarkText, 
  documentType, 
  password, 
  isPro,
  metadataOptions,
  file,
  videoRef
}: UseFileExportProps) {
  
  const getPreviewUrls = useCallback(async (onBeforeExport?: () => Promise<void>) => {
    if (canvases.length === 0) return [];
    
    if (onBeforeExport) {
      await onBeforeExport();
      // Give browser time to paint
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    // Only return the first page for preview as requested
    return [canvases[0].toDataURL("image/png", 0.9)];
  }, [canvases]);

  const generateBlobAndFileName = useCallback(async () => {
    if (canvases.length === 0) return null;

    if (documentType === "pdf") {
      // ... [PDF logic remains the same] ...
      // (Restoring the existing PDF logic)
      const pdfOptions: jsPDFOptions = {
        orientation: canvases[0].width > canvases[0].height ? "l" : "p",
        unit: "px",
        format: [canvases[0].width, canvases[0].height]
      };

      if (isPro && password) {
        pdfOptions.encryption = {
          userPassword: password,
          ownerPassword: password,
          userPermissions: ["print", "modify", "copy", "annot-forms"]
        };
      }

      const pdf = new jsPDF(pdfOptions);

      canvases.forEach((canvas, index) => {
        if (index > 0) {
          pdf.addPage([canvas.width, canvas.height], canvas.width > canvas.height ? "l" : "p");
        }
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, canvas.width, canvas.height);
      });

      const properties: any = {
        author: " ", creator: " ", producer: " ", title: " ", subject: " ", keywords: " ", creationDate: new Date(0)
      };
      pdf.setProperties(properties);

      const pdfBlob = pdf.output("blob");
      const fileName = `docsguard-${watermarkText.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.pdf`;
      return { blob: pdfBlob, fileName, contentType: "application/pdf" };
    } else if (documentType === "video") {
      let video = videoRef?.current;
      if (!video) video = document.querySelector('video');
      
      if (!video) {
        console.error("Video element not found for export");
        return null;
      }

      // DETECT INPUT FPS: Measure actual frame rate of the video
      const detectFps = async (): Promise<number> => {
        return new Promise((resolve) => {
          // @ts-ignore - only works in modern browsers/iOS
          if (!video!.requestVideoFrameCallback) {
            resolve(60); // Default fallback
            return;
          }

          let frames = 0;
          let startTime = 0;
          
          const check = (now: number, metadata: any) => {
            if (startTime === 0) startTime = metadata.presentationTime;
            frames++;
            
            // Measure over ~500ms for a stable estimate
            if (metadata.presentationTime - startTime >= 500) {
              const estimatedFps = Math.round((frames / (metadata.presentationTime - startTime)) * 1000);
              console.log(`[VIDEO] Detected input FPS: ${estimatedFps}`);
              resolve(estimatedFps);
            } else {
              // @ts-ignore
              video!.requestVideoFrameCallback(check);
            }
          };
          
          // @ts-ignore
          video!.requestVideoFrameCallback(check);
        });
      };

      const canvas = canvases[0];
      const targetFps = await detectFps();
      
      // Use the detected FPS (or fallback) for a perfectly synced stream
      // @ts-ignore
      const stream = canvas.captureStream(targetFps);
      
      const isIOS = Capacitor.getPlatform() === 'ios';
      const mimeType = isIOS ? 'video/mp4' : 'video/webm;codecs=vp9';
      const fileExt = isIOS ? 'mp4' : 'webm';
      
      // OPTIMIZED BITRATE: 50Mbps is the sweet spot for 4K 60fps stability on iOS
      // Too high (80Mbps) can cause the hardware encoder to drop frames (choppy output)
      const recorder = new MediaRecorder(stream, { 
        mimeType,
        videoBitsPerSecond: 50000000 
      });
      
      const chunks: Blob[] = [];

      return new Promise<{ blob: Blob, fileName: string, contentType: string } | null>(async (resolve) => {
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          const fileName = `docsguard-${watermarkText.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.${fileExt}`;
          resolve({ blob, fileName, contentType: mimeType });
        };

        // Ensure video is ready and reset
        const wasPaused = video!.paused;
        video!.pause();
        video!.currentTime = 0;
        video!.muted = true; 
        
        // Wait for seek to complete
        await new Promise(r => {
          const onSeek = () => {
            video!.removeEventListener('seeked', onSeek);
            r(null);
          };
          video!.addEventListener('seeked', onSeek);
        });
        
        // Start recording
        recorder.start(200);
        
        try {
          await video!.play();
          
          const checkEnd = setInterval(() => {
            if (video!.ended || video!.currentTime >= video!.duration - 0.05) {
              clearInterval(checkEnd);
              setTimeout(() => {
                recorder.stop();
                if (wasPaused) video!.pause();
                video!.muted = false;
              }, 500);
            }
          }, 100);
        } catch (err) {
          console.error("Video playback failed during export", err);
          recorder.stop();
          resolve(null);
        }
      });
    } else {
      const canvas = canvases[0];
      const isOriginalJpg = file?.type === "image/jpeg" || file?.name.toLowerCase().endsWith(".jpg") || file?.name.toLowerCase().endsWith(".jpeg");
      const exportType = isOriginalJpg ? "image/jpeg" : "image/png";
      const fileExt = isOriginalJpg ? "jpg" : "png";
      
      const fileName = `docsguard-${watermarkText.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.${fileExt}`;
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), exportType, 0.95);
      });
      return { blob, fileName, contentType: exportType };
    }
  }, [canvases, watermarkText, documentType, password, isPro, metadataOptions, file]);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result) {
          const base64Data = result.split(",")[1];
          resolve(base64Data);
        } else {
          reject(new Error("FileReader result is empty"));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  };

  const saveToDevice = useCallback(async (onBeforeExport?: () => Promise<void>) => {
    try {
      if (onBeforeExport) {
        await onBeforeExport();
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      const result = await generateBlobAndFileName();
      if (!result || !result.blob) return false;

      const { blob, fileName, contentType } = result;
      const isNative = isCapacitorApp();

      if (!isNative) {
        saveAndOpenBlob(blob, fileName, contentType);
      } else {
        const base64Data = await blobToBase64(blob);
        
        // 1. Always save to Filesystem first (Data folder for better visibility to plugins)
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Data,
        });
        
        console.log("Saved to Filesystem:", savedFile.uri);

        // 2. Additional handling per type
        if (documentType === "image") {
          try {
            await Media.savePhoto({
              path: savedFile.uri
            });
            console.log("Saved to Gallery");
          } catch (err) {
            console.error("Failed to save to Gallery:", err);
          }
        } else if (documentType === "video") {
          try {
            // Ensure the file is treated as a video during gallery save
            await Media.saveVideo({
              path: savedFile.uri
            });
            console.log("Video saved to Gallery successfully");
          } catch (err) {
            console.error("Failed to save video to Gallery:", err);
            // Fallback: trigger share dialog so user can "Save to Files"
            await Share.share({
              title: fileName,
              url: savedFile.uri
            });
          }
        } else if (documentType === "pdf") {
          // On iOS, sometimes saving to Documents isn't enough to "see" it immediately
          // Triggering a share dialog for PDF is the standard way to "Save to Files"
          try {
             await Share.share({
               title: fileName,
               text: "Your watermarked PDF is ready",
               url: savedFile.uri,
               dialogTitle: "Save or Share PDF",
             });
          } catch (err) {
            console.error("Failed to trigger share for PDF:", err);
          }
        }
      }
      return true;
    } catch (error) {
      console.error("Error saving file:", error);
      return false;
    }
  }, [generateBlobAndFileName, documentType]);

  const shareFile = useCallback(async (onBeforeExport?: () => Promise<void>) => {
    try {
      if (onBeforeExport) {
        await onBeforeExport();
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      const result = await generateBlobAndFileName();
      if (!result || !result.blob) return false;

      const { blob, fileName } = result;
      const isNative = isCapacitorApp();

      if (!isNative) {
        if (navigator.share) {
          const file = new File([blob], fileName, { type: blob.type });
          await navigator.share({
            files: [file],
            title: "Watermarked Document",
            text: "Sharing from DocsGuard"
          });
          return true;
        } else {
          saveAndOpenBlob(blob, fileName, blob.type);
          return true;
        }
      } else {
        const base64Data = await blobToBase64(blob);
        
        const tempPath = `share-${Date.now()}-${fileName}`;
        const resultFile = await Filesystem.writeFile({
          path: tempPath,
          data: base64Data,
          directory: Directory.Cache,
        });

        await Share.share({
          title: fileName,
          text: "Watermarked with DocsGuard",
          url: resultFile.uri,
          dialogTitle: "Share Document",
        });
        
        return true;
      }
    } catch (error) {
      console.error("Error sharing file:", error);
      return false;
    }
  }, [generateBlobAndFileName]);

  return { getPreviewUrls, saveToDevice, shareFile };
}



