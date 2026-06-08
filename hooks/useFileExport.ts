import { useCallback } from "react";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Media } from "@capacitor-community/media";
import { Capacitor } from "@capacitor/core";
import { isCapacitorApp, saveAndOpenBlob } from "@/lib/utils";
import { jsPDF } from "jspdf";
import { VideoWatermark } from "@/lib/plugins/VideoWatermark";
import { applyWatermarkToContext, applyBlurToContext } from "@/lib/watermark_utils";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { renderPdfPageToCanvas } from "@/lib/pdf";

interface UseFileExportProps {
  canvases: HTMLCanvasElement[];
  watermarkText: string;
  documentType: "image" | "pdf" | "video" | null;
  password?: string;
  isPro?: boolean;
  file?: File | null;
  videoRef?: React.MutableRefObject<HTMLVideoElement | null>;
  watermarkColor?: string;
  watermarkOpacity?: number;
  watermarkLayout?: string;
  fontSize?: number;
  fontFamily?: string;
  orientation?: "horizontal" | "diagonal" | "vertical";
  watermarkType?: "text" | "image";
  watermarkImage?: HTMLImageElement | null;
  imageScale?: number;
  blurAreas?: any[];
  blurStrength?: number;
  pdfDoc?: PDFDocumentProxy | null;
  drawWatermark?: (onlyFirstPage?: boolean) => Promise<void>;
  onProgress?: (text: string) => void;
}

export function useFileExport({ 
  canvases, 
  watermarkText, 
  documentType, 
  password, 
  isPro,
  file,
  videoRef,
  drawWatermark,
  watermarkColor = "#000000",
  watermarkOpacity = 0.3,
  watermarkLayout = "tiled",
  fontSize = 40,
  fontFamily = "Arial",
  orientation = "diagonal",
  watermarkType = "text",
  watermarkImage = null,
  imageScale = 0.5,
  blurAreas = [],
  blurStrength = 10,
  pdfDoc,
  onProgress
}: UseFileExportProps) {
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

  const generateBlobAndFileName = useCallback(async (): Promise<{ blob: Blob, fileName: string, contentType: string } | null> => {
    // If it's a PDF, we process the whole document using pdfDoc regardless of UI canvases
    if (documentType === "pdf") {
      if (!pdfDoc) {
        console.error("[EXPORT] PDF doc is missing");
        return null;
      }
      
      onProgress?.(`Preparing document...`);
      let pdf: jsPDF | null = null;
      const total = pdfDoc.numPages;

      for (let i = 1; i <= total; i++) {
        onProgress?.(`Preparing ${i}/${total} pages`);
        
        // Use a fresh temporary canvas for each page to ensure complete memory isolation
        const tempCanvas = document.createElement("canvas");
        const ctx = tempCanvas.getContext("2d", { alpha: false });
        if (!ctx) throw new Error("Export context failed");

        // Important: set the index so renderPdfPageToCanvas knows which page to fetch
        tempCanvas.setAttribute('data-page-index', (i - 1).toString());
        
        // Render base PDF page
        await renderPdfPageToCanvas(pdfDoc, i, tempCanvas);

        // Apply shared utilities
        applyBlurToContext(ctx, tempCanvas, i - 1, blurAreas || [], blurStrength || 10);
        applyWatermarkToContext(ctx, tempCanvas.width, tempCanvas.height, {
          text: watermarkText,
          type: watermarkType,
          layout: watermarkLayout as any,
          color: watermarkColor,
          opacity: watermarkOpacity,
          fontFamily,
          fontSize,
          orientation,
          image: watermarkImage,
          imageScale
        });

        // COMPRESSION: Use 0.7 quality for JPEG to significantly reduce PDF file size
        const imgData = tempCanvas.toDataURL("image/jpeg", 0.7);

        if (!pdf) {
          pdf = new jsPDF({
            orientation: tempCanvas.width > tempCanvas.height ? "l" : "p",
            unit: "px",
            format: [tempCanvas.width, tempCanvas.height],
            compress: true
          });

          if (isPro && password) {
            (pdf as any).setEncryption({
              userPassword: password,
              ownerPassword: password,
              userPermissions: ["print", "modify", "copy", "annot-forms"]
            });
          }
        } else {
          // Add a new page matching the current dimensions
          pdf.addPage([tempCanvas.width, tempCanvas.height], tempCanvas.width > tempCanvas.height ? "l" : "p");
        }

        // Always add the image to the CURRENT (last) page
        pdf.addImage(imgData, "JPEG", 0, 0, tempCanvas.width, tempCanvas.height, undefined, 'FAST');
        
        // Destroy canvas immediately
        tempCanvas.width = 0;
        tempCanvas.height = 0;

        // Periodic breather for high page counts
        if (i % 10 === 0) {
          console.log(`[EXPORT] Progress: ${Math.round((i/total)*100)}%`);
          await new Promise(r => setTimeout(r, 20));
        }
      }

      if (!pdf) return null;

      pdf.setProperties({
        author: " ", creator: " ", title: " ", subject: " ", keywords: " ", creationDate: new Date(0)
      } as any);

      onProgress?.("COMPLETED");
      // Small delay so user can see the checkmark before popup disappears
      await new Promise(r => setTimeout(r, 600));

      const pdfBlob = pdf.output("blob");
      const fileName = `docsguard-${watermarkText.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.pdf`;
      console.log(`[EXPORT] Done. Final size: ${Math.round(pdfBlob.size/1024)}KB`);
      return { blob: pdfBlob, fileName, contentType: "application/pdf" };

    } else if (documentType === "video") {
      let video = videoRef?.current;
      if (!video) video = document.querySelector('video');
      
      if (!video) {
        console.error("Video element not found for export");
        return null;
      }

      const isNative = Capacitor.isNativePlatform();
      const isIOS = Capacitor.getPlatform() === 'ios';

      // NATIVE PLUGIN OPTIMIZATION: If we are on a native platform, use the high-performance AVFoundation/MediaCodec plugin
      if (isNative) {
        onProgress?.("Processing video natively (Ultra-Fast)...");
        try {
          // We need the absolute path for the native plugin
          const videoUri = Capacitor.convertFileSrc(URL.createObjectURL(file!));
          const result = await VideoWatermark.addTextWatermark({
            videoUri: videoUri, // Native plugin might need internal path, but we try URI first
            text: watermarkText,
            colorHex: watermarkColor,
            fontSize: fontSize,
            opacity: watermarkOpacity,
            layout: watermarkLayout as any
          });
          
          if (result && result.uri) {
            const fileName = `docsguard-${watermarkText.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.${isIOS ? 'mp4' : 'webm'}`;
            // Fetch the native file back as a blob for consistent return
            const response = await fetch(Capacitor.convertFileSrc(result.uri));
            const blob = await response.blob();
            return { blob, fileName, contentType: isIOS ? 'video/mp4' : 'video/webm' };
          }
        } catch (err) {
          console.error("Native video watermarking failed, falling back to Canvas method", err);
        }
      }

      const canvas = canvases[0];
      
      // FORCED 60 FPS: High-frequency capture stream
      const stream = canvas.captureStream(60);
      
      // Standard mp4 for iOS compatibility
      const mimeType = isIOS ? 'video/mp4' : 'video/webm';
      const fileExt = isIOS ? 'mp4' : 'webm';
      
      // BALANCED BITRATE for 60 FPS: 15Mbps (Prevents encoder lag while maintaining quality)
      const recorder = new MediaRecorder(stream, { 
        mimeType,
        videoBitsPerSecond: 15000000 
      });
      
      const chunks: Blob[] = [];

      return new Promise<{ blob: Blob, fileName: string, contentType: string } | null>(async (resolve) => {
        let isRecording = true;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          const fileName = `docsguard-${watermarkText.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.${fileExt}`;
          resolve({ blob, fileName, contentType: mimeType });
        };

        // Reset video to start
        video!.pause();
        video!.currentTime = 0;
        video!.muted = true; 
        
        await new Promise(r => {
          const onSeek = () => {
            video!.removeEventListener('seeked', onSeek);
            r(null);
          };
          video!.addEventListener('seeked', onSeek);
        });

        // Start recording
        recorder.start();

        // FORCED 60FPS DRAW LOOP
        // Using a high-precision hybrid loop to ensure 60fps output
        const FRAME_TIME = 1000 / 60;
        let lastDraw = performance.now();

        const exportLoop = async () => {
          if (!isRecording) return;

          const now = performance.now();
          if (now - lastDraw >= FRAME_TIME - 1) { // -1ms buffer for jitter
            if (drawWatermark) {
              await drawWatermark(true);
            }
            lastDraw = now;
          }
          
          if (video!.ended || video!.currentTime >= video!.duration - 0.05) {
            isRecording = false;
            // Add a small buffer to ensure the last frame is captured
            setTimeout(() => {
              if (recorder.state !== "inactive") recorder.stop();
              video!.pause();
              video!.muted = false;
            }, 500);
            return;
          }

          // Use requestAnimationFrame for visual sync, but fallback to setTimeout
          // to maintain 60fps even if the tab is partially throttled.
          requestAnimationFrame(exportLoop);
        };
        
        // Start a secondary "heartbeat" interval to force frames if requestAnimationFrame slows down
        const heartbeat = setInterval(() => {
          if (!isRecording) {
            clearInterval(heartbeat);
            return;
          }
          const now = performance.now();
          if (now - lastDraw > FRAME_TIME * 2) {
             exportLoop(); // Force a frame if we're lagging
          }
        }, FRAME_TIME);
        
        try {
          await video!.play();
          exportLoop();
        } catch (err) {
          console.error("Video playback failed during export", err);
          recorder.stop();
          resolve(null);
        }
      });
    } else {
      // IMAGE EXPORT
      const canvas = canvases[0];
      if (!canvas) return null;
      
      const isOriginalJpg = file?.type === "image/jpeg" || file?.name.toLowerCase().endsWith(".jpg") || file?.name.toLowerCase().endsWith(".jpeg");
      const exportType = isOriginalJpg ? "image/jpeg" : "image/png";
      const fileExt = isOriginalJpg ? "jpg" : "png";
      
      const fileName = `docsguard-${watermarkText.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.${fileExt}`;
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), exportType, 0.7);
      });
      if (!blob) return null;
      return { blob, fileName, contentType: exportType };
    }
  }, [canvases, watermarkText, documentType, password, isPro, file, watermarkColor, watermarkOpacity, watermarkLayout, fontSize, fontFamily, orientation, watermarkType, watermarkImage, imageScale, blurAreas, blurStrength, pdfDoc]);

  const saveToDevice = useCallback(async (onBeforeExport?: () => Promise<void>) => {
    try {
      if (onBeforeExport) await onBeforeExport();
      
      const result = await generateBlobAndFileName();
      if (!result || !result.blob) return false;

      const { blob, fileName, contentType } = result;
      const isNative = isCapacitorApp();

      if (!isNative) {
        saveAndOpenBlob(blob, fileName, contentType);
      } else {
        const isIOS = Capacitor.getPlatform() === 'ios';
        
        // Write file to device
        const base64Data = await blobToBase64(blob);
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: isIOS ? Directory.Documents : Directory.Data,
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));

        if (documentType === "image") {
          await Media.savePhoto({ path: savedFile.uri });
        } else if (documentType === "video") {
          try {
            await Media.saveVideo({ path: savedFile.uri });
          } catch (err) {
            await Share.share({ title: fileName, url: savedFile.uri });
          }
        } else if (documentType === "pdf") {
          await Share.share({ title: fileName, url: savedFile.uri });
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
      if (onBeforeExport) await onBeforeExport();

      const result = await generateBlobAndFileName();
      if (!result || !result.blob) return false;

      const { blob, fileName } = result;
      const isNative = isCapacitorApp();

      if (!isNative) {
        if (navigator.share) {
          const file = new File([blob], fileName, { type: blob.type });
          await navigator.share({ files: [file], title: "Watermarked", text: "DocsGuard" });
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

        await Share.share({ title: fileName, url: resultFile.uri });
        return true;
      }
    } catch (error) {
      console.error("Error sharing file:", error);
      return false;
    }
  }, [generateBlobAndFileName]);

  return { saveToDevice, shareFile };
}
