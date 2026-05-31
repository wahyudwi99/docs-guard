import { useCallback } from "react";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Media } from "@capacitor-community/media";
import { Capacitor } from "@capacitor/core";
import { isCapacitorApp, saveAndOpenBlob } from "@/lib/utils";
import { jsPDF, jsPDFOptions } from "jspdf";
import { processVideoWithWatermark } from "@/lib/ffmpeg";

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
  drawWatermark?: (onlyFirstPage?: boolean) => Promise<void>;
  watermarkColor?: string;
  watermarkOpacity?: number;
  watermarkLayout?: string;
  fontSize?: number;
}

export function useFileExport({ 
  canvases, 
  watermarkText, 
  documentType, 
  password, 
  isPro,
  metadataOptions,
  file,
  videoRef,
  drawWatermark,
  watermarkColor,
  watermarkOpacity,
  watermarkLayout,
  fontSize
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

  const generateBlobAndFileName = useCallback(async (): Promise<{ blob: Blob, fileName: string, contentType: string } | null> => {
    if (canvases.length === 0) return null;

    if (documentType === "pdf") {
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
    } else if (documentType === "video" && file) {
      // --- NEW: PROFESSIONAL FFMPEG.WASM EXPORT ---
      // This guarantees 100% original quality and fluidity for 4K video.
      try {
        console.log("[VIDEO] Starting FFmpeg processing...");
        const blob = await processVideoWithWatermark(file, watermarkText, {
          color: watermarkColor,
          opacity: watermarkOpacity,
          fontSize: fontSize,
          layout: watermarkLayout as any
        });
        
        const fileName = `docsguard-${watermarkText.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.mp4`;
        console.log("[VIDEO] FFmpeg processing complete.");
        return { blob, fileName, contentType: "video/mp4" };
      } catch (err) {
        console.error("[VIDEO] FFmpeg processing failed:", err);
        return null;
      }
    } else {
      const canvas = canvases[0];
      const isOriginalJpg = file?.type === "image/jpeg" || file?.name.toLowerCase().endsWith(".jpg") || file?.name.toLowerCase().endsWith(".jpeg");
      const exportType = isOriginalJpg ? "image/jpeg" : "image/png";
      const fileExt = isOriginalJpg ? "jpg" : "png";
      
      const fileName = `docsguard-${watermarkText.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.${fileExt}`;
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), exportType, 0.95);
      });
      if (!blob) return null;
      return { blob, fileName, contentType: exportType };
    }
  }, [canvases, watermarkText, documentType, password, isPro, metadataOptions, file, videoRef, drawWatermark, watermarkColor, watermarkOpacity, watermarkLayout, fontSize]);

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
        const isIOS = Capacitor.getPlatform() === 'ios';
        
        if (documentType === "video") {
           // --- CHUNKED WRITING FOR VIDEO (Prevent RAM Crash) ---
           console.log(`[EXPORT] Starting chunked write for video (${blob.size} bytes)...`);
           
           // Create empty file first
           await Filesystem.writeFile({
             path: fileName,
             data: "",
             directory: isIOS ? Directory.Documents : Directory.Data,
           });

           const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
           let offset = 0;

           while (offset < blob.size) {
             const chunk = blob.slice(offset, offset + CHUNK_SIZE);
             const base64Chunk = await blobToBase64(chunk);
             
             await Filesystem.appendFile({
               path: fileName,
               data: base64Chunk,
               directory: isIOS ? Directory.Documents : Directory.Data,
             });
             
             offset += CHUNK_SIZE;
             console.log(`[EXPORT] Written ${Math.min(offset, blob.size)} bytes...`);
           }

           const savedFile = await Filesystem.getUri({
             path: fileName,
             directory: isIOS ? Directory.Documents : Directory.Data,
           });

           console.log("Video saved to:", savedFile.uri);
           await new Promise(resolve => setTimeout(resolve, 500));

           try {
             await Media.saveVideo({ path: savedFile.uri });
             console.log("Video saved to Gallery successfully");
           } catch (err) {
             console.error("Gallery save failed:", err);
             await Share.share({ title: fileName, url: savedFile.uri });
           }
        } else {
          // Standard handle for images/pdf
          const base64Data = await blobToBase64(blob);
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: isIOS ? Directory.Documents : Directory.Data,
          });
          
          if (documentType === "image") {
            await Media.savePhoto({ path: savedFile.uri });
          } else {
            await Share.share({ title: fileName, url: savedFile.uri });
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
