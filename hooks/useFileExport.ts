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

      const pdfBlob = pdf.output("blob");
      const fileName = `docsguard-${watermarkText.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.pdf`;
      console.log(`[EXPORT] Done. Final size: ${Math.round(pdfBlob.size/1024)}KB`);
      return { blob: pdfBlob, fileName, contentType: "application/pdf" };

    } else if (documentType === "video" && file) {
      // --- NATIVE INLINE ENGINE FOR VIDEO ---
      try {
        onProgress?.("Initializing high-speed video engine...");
        const isIOS = Capacitor.getPlatform() === 'ios';
        if (!isIOS) return null;

        const base64Input = await blobToBase64(file);
        const tempIn = await Filesystem.writeFile({
          path: `input_${Date.now()}.mp4`,
          data: base64Input,
          directory: Directory.Cache
        });

        onProgress?.("Applying watermark at original quality...");
        const result = await VideoWatermark.addTextWatermark({
          videoUri: tempIn.uri,
          text: watermarkText,
          colorHex: watermarkColor || "#FFFFFF",
          opacity: watermarkOpacity || 0.5,
          layout: (watermarkLayout as any) || "tiled",
          fontSize: fontSize || 40
        });

        onProgress?.("Finalizing video file...");
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
        console.error("[VIDEO] Native engine failed:", err);
        return null;
      }
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
