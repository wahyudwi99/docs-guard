import { useCallback } from "react";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Media } from "@capacitor-community/media";
import { Capacitor } from "@capacitor/core";
import { isCapacitorApp, saveAndOpenBlob } from "@/lib/utils";
import { jsPDF, jsPDFOptions } from "jspdf";
import { VideoWatermark } from "@/lib/plugins/VideoWatermark";

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
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    return [canvases[0].toDataURL("image/png", 0.9)];
  }, [canvases]);

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
      // --- FINAL SOLUTION: NATIVE INLINE ENGINE ---
      try {
        console.log("[VIDEO] Starting Native Inline Processing...");
        const isIOS = Capacitor.getPlatform() === 'ios';
        
        if (!isIOS) throw new Error("Native only for iOS");

        // Prepare file for native
        const base64Input = await blobToBase64(file);
        const tempIn = await Filesystem.writeFile({
          path: `input_${Date.now()}.mp4`,
          data: base64Input,
          directory: Directory.Cache
        });

        const result = await VideoWatermark.addTextWatermark({
          videoUri: tempIn.uri,
          text: watermarkText,
          colorHex: watermarkColor || "#FFFFFF",
          opacity: watermarkOpacity || 0.5,
          layout: (watermarkLayout as any) || "tiled",
          fontSize: fontSize || 40
        });

        const processed = await Filesystem.readFile({ path: result.uri });
        const byteCharacters = atob(processed.data as string);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'video/mp4' });

        const fileName = `docsguard-${watermarkText.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.mp4`;
        return { blob, fileName, contentType: "video/mp4" };
      } catch (err) {
        console.error("[VIDEO] Native engine failed, check AppDelegate.swift registration:", err);
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
        const base64Data = await blobToBase64(blob);
        
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: isIOS ? Directory.Documents : Directory.Data,
        });
        
        console.log("Saved to Filesystem:", savedFile.uri);
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

  return { getPreviewUrls, saveToDevice, shareFile };
}
