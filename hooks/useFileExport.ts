import { useCallback } from "react";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Media } from "@capacitor-community/media";
import { Capacitor } from "@capacitor/core";
import { isCapacitorApp, saveAndOpenBlob } from "@/lib/utils";
import { jsPDF } from "jspdf";
import { applyWatermarkToContext, applyBlurToContext } from "@/lib/watermark_utils";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { renderPdfPageToCanvas } from "@/lib/pdf";
import { processVideoWithCanvas } from "@/lib/videoProcessor";

interface UseFileExportProps {
  canvases: HTMLCanvasElement[];
  watermarkText: string;
  documentType: "image" | "pdf" | "video" | null;
  password?: string;
  isPro?: boolean;
  file?: File | null;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
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

interface ExportResult {
  blob?: Blob;
  nativeUri?: string;
  fileName: string;
  contentType: string;
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

  const generateBlobAndFileName = useCallback(async () => {
    const timestamp = Date.now();
    const safeText = watermarkText.replace(/[^a-z0-9]/gi, "_");

    if (documentType === "pdf") {
      if (!pdfDoc) return null;
      onProgress?.(`Preparing document...`);
      let pdf: jsPDF | null = null;
      const total = pdfDoc.numPages;

      for (let i = 1; i <= total; i++) {
        onProgress?.(`Preparing ${i}/${total} pages`);
        const tempCanvas = document.createElement("canvas");
        const ctx = tempCanvas.getContext("2d", { alpha: false });
        if (!ctx) throw new Error("Export context failed");
        tempCanvas.setAttribute('data-page-index', (i - 1).toString());
        await renderPdfPageToCanvas(pdfDoc, i, tempCanvas);
        applyBlurToContext(ctx, tempCanvas, i - 1, blurAreas || [], blurStrength || 10);
        applyWatermarkToContext(ctx, tempCanvas.width, tempCanvas.height, {
          text: watermarkText, type: watermarkType, layout: watermarkLayout as any,
          color: watermarkColor, opacity: watermarkOpacity, fontFamily, fontSize,
          orientation, image: watermarkImage, imageScale
        });
        const imgData = tempCanvas.toDataURL("image/jpeg", 0.7);
        if (!pdf) {
          const pdfOptions: any = {
            orientation: tempCanvas.width > tempCanvas.height ? "l" : "p",
            unit: "px", format: [tempCanvas.width, tempCanvas.height], compress: true
          };
          if (isPro && password) {
            pdfOptions.encryption = {
              userPassword: password, ownerPassword: password,
              userPermissions: ["print", "modify", "copy", "annot-forms"]
            };
          }
          pdf = new jsPDF(pdfOptions);
        } else {
          pdf.addPage([tempCanvas.width, tempCanvas.height], tempCanvas.width > tempCanvas.height ? "l" : "p");
        }
        pdf.addImage(imgData, "JPEG", 0, 0, tempCanvas.width, tempCanvas.height, undefined, 'FAST');
        tempCanvas.width = 0; tempCanvas.height = 0;
        if (i % 10 === 0) await new Promise(r => setTimeout(r, 20));
      }

      if (!pdf) return null;
      pdf.setProperties({ author: " ", creator: " ", title: " ", subject: " ", keywords: " ", creationDate: new Date(0) } as any);
      onProgress?.("COMPLETED");
      await new Promise(r => setTimeout(r, 600));
      const blob = pdf.output("blob");
      return { blob, fileName: `docsguard-${safeText}-${timestamp}.pdf`, contentType: "application/pdf" };

    } else if (documentType === "video") {
      if (!file) return null;
      onProgress?.("Processing video...");
      const { blob, ext, mimeType } = await processVideoWithCanvas(
        file,
        watermarkText,
        {
          color: watermarkColor,
          opacity: watermarkOpacity,
          fontSize: fontSize,
          layout: watermarkLayout as any
        },
        onProgress
      );
      onProgress?.("COMPLETED");
      return { blob, fileName: `docsguard-${safeText}-${timestamp}.${ext}`, contentType: mimeType };
    } else {
      // IMAGE
      const canvas = canvases[0];
      if (!canvas) return null;
      const isOriginalJpg = file?.type === "image/jpeg" || file?.name.toLowerCase().endsWith(".jpg");
      const exportType = isOriginalJpg ? "image/jpeg" : "image/png";
      const fileExt = isOriginalJpg ? "jpg" : "png";
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), exportType, 0.7));
      if (!blob) return null;
      return { blob, fileName: `docsguard-${safeText}-${timestamp}.${fileExt}`, contentType: exportType };
    }
  }, [canvases, watermarkText, documentType, password, isPro, file, watermarkColor, watermarkOpacity, watermarkLayout, fontSize, fontFamily, orientation, watermarkType, watermarkImage, imageScale, blurAreas, blurStrength, pdfDoc, drawWatermark, onProgress]);

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
            await Media.saveVideo({
              path: savedFile.uri
            });
            console.log("Saved Video to Gallery");
          } catch (err) {
            console.error("Failed to save Video to Gallery:", err);
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

  return { saveToDevice, shareFile };
}
