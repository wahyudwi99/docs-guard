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
  pdfDoc
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
    if (canvases.length === 0 && documentType !== "pdf") return null;

    if (documentType === "pdf" && pdfDoc) {
      // --- SEQUENTIAL PDF EXPORT (All Pages) ---
      console.log(`[EXPORT] Starting sequential PDF export for ${pdfDoc.numPages} pages...`);
      
      const tempCanvas = document.createElement("canvas");
      const ctx = tempCanvas.getContext("2d");
      if (!ctx) throw new Error("Could not create export context");

      let pdf: jsPDF | null = null;

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        // 1. Render base PDF page to temp canvas at high res
        await renderPdfPageToCanvas(pdfDoc, i, tempCanvas);

        // 2. Apply Blur and Watermark using shared utilities
        applyBlurToContext(ctx, tempCanvas, i - 1, blurAreas, blurStrength);
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

        // 3. Initialize or add to jsPDF
        const imgData = tempCanvas.toDataURL("image/jpeg", 0.92);
        
        if (!pdf) {
          const pdfOptions: any = {
            orientation: tempCanvas.width > tempCanvas.height ? "l" : "p",
            unit: "px",
            format: [tempCanvas.width, tempCanvas.height]
          };

          if (isPro && password) {
            pdfOptions.encryption = {
              userPassword: password,
              ownerPassword: password,
              userPermissions: ["print", "modify", "copy", "annot-forms"]
            };
          }

          pdf = new jsPDF(pdfOptions);
        } else {
          pdf.addPage([tempCanvas.width, tempCanvas.height], tempCanvas.width > tempCanvas.height ? "l" : "p");
        }

        pdf.addImage(imgData, "JPEG", 0, 0, tempCanvas.width, tempCanvas.height);
        
        // Small delay to let browser breathe
        if (i % 10 === 0) await new Promise(r => setTimeout(r, 10));
      }

      if (!pdf) return null;

      pdf.setProperties({
        author: " ", creator: " ", title: " ", subject: " ", keywords: " ", creationDate: new Date(0)
      } as any);

      const pdfBlob = pdf.output("blob");
      const fileName = `docsguard-${watermarkText.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.pdf`;
      return { blob: pdfBlob, fileName, contentType: "application/pdf" };

    } else if (documentType === "video" && file) {
      // --- NATIVE INLINE ENGINE FOR VIDEO ---
      try {
        const isIOS = Capacitor.getPlatform() === 'ios';
        if (!isIOS) return null;

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
        canvas.toBlob((b) => resolve(b), exportType, 0.95);
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
