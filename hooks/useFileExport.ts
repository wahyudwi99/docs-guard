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

  const generateExportResult = useCallback(async (): Promise<ExportResult | null> => {
    const isNative = Capacitor.isNativePlatform();
    const isIOS = Capacitor.getPlatform() === 'ios';
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
          pdf = new jsPDF({
            orientation: tempCanvas.width > tempCanvas.height ? "l" : "p",
            unit: "px", format: [tempCanvas.width, tempCanvas.height], compress: true
          });
          if (isPro && password) {
            (pdf as any).setEncryption({
              userPassword: password, ownerPassword: password,
              userPermissions: ["print", "modify", "copy", "annot-forms"]
            });
          }
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
      // For video, we'll capture the stream from the canvas
      const canvas = canvases[0];
      // @ts-ignore - captureStream is not always in types
      const stream = canvas.captureStream(30);
      
      // Determine the best MIME type for the platform (iOS prefers mp4)
      const isIOS = Capacitor.getPlatform() === 'ios';
      const mimeType = isIOS ? 'video/mp4' : 'video/webm';
      const fileExt = file?.name?.split('.').pop() || (isIOS ? 'mp4' : 'webm');
      
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      return new Promise<ExportResult | null>((resolve) => {
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          const fileName = `docsguard-${safeText}-${timestamp}.${fileExt}`;
          resolve({ blob, fileName, contentType: mimeType });
        };
        
        // Start recording
        recorder.start();
        
        // In a real scenario, we should record until the video ends.
        // For now, we'll record for a fixed duration placeholder (e.g., 10s)
        // or let the user decide.
        setTimeout(() => recorder.stop(), 5000); 
      });

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
  }, [canvases, watermarkText, documentType, password, isPro, file, watermarkColor, watermarkOpacity, watermarkLayout, fontSize, fontFamily, orientation, watermarkType, watermarkImage, imageScale, blurAreas, blurStrength, pdfDoc, videoRef, drawWatermark, onProgress]);

  const saveToDevice = useCallback(async (onBeforeExport?: () => Promise<void>) => {
    try {
      if (onBeforeExport) await onBeforeExport();
      const result = await generateExportResult();
      if (!result) return false;
      const isNative = isCapacitorApp();

      if (!isNative) {
        if (result.blob) saveAndOpenBlob(result.blob, result.fileName, result.contentType);
      } else {
        const isIOS = Capacitor.getPlatform() === 'ios';
        let finalUri = result.nativeUri;

        if (!finalUri && result.blob) {
          const base64Data = await blobToBase64(result.blob);
          const savedFile = await Filesystem.writeFile({
            path: result.fileName, data: base64Data, directory: isIOS ? Directory.Documents : Directory.Data,
          });
          finalUri = savedFile.uri;
        }
        
        if (!finalUri) return false;
        await new Promise(resolve => setTimeout(resolve, 500));

        if (documentType === "image") {
          await Media.savePhoto({ path: finalUri });
        } else if (documentType === "video") {
          try {
            await Media.saveVideo({ path: finalUri });
          } catch (err) {
            await Share.share({ title: result.fileName, url: finalUri });
          }
        } else if (documentType === "pdf") {
          await Share.share({ title: result.fileName, url: finalUri });
        }
      }
      return true;
    } catch (error) {
      console.error("Error saving file:", error);
      return false;
    }
  }, [generateExportResult, documentType]);

  const shareFile = useCallback(async (onBeforeExport?: () => Promise<void>) => {
    try {
      if (onBeforeExport) await onBeforeExport();
      const result = await generateExportResult();
      if (!result) return false;
      const isNative = isCapacitorApp();

      if (!isNative) {
        if (navigator.share && result.blob) {
          const file = new File([result.blob], result.fileName, { type: result.blob.type });
          await navigator.share({ files: [file], title: "Watermarked", text: "DocsGuard" });
        } else if (result.blob) {
          saveAndOpenBlob(result.blob, result.fileName, result.blob.type);
        }
        return true;
      } else {
        let finalUri = result.nativeUri;
        if (!finalUri && result.blob) {
          const base64Data = await blobToBase64(result.blob);
          const resultFile = await Filesystem.writeFile({
            path: `share-${result.fileName}`, data: base64Data, directory: Directory.Cache,
          });
          finalUri = resultFile.uri;
        }
        if (finalUri) await Share.share({ title: result.fileName, url: finalUri });
        return true;
      }
    } catch (error) {
      console.error("Error sharing file:", error);
      return false;
    }
  }, [generateExportResult]);

  return { saveToDevice, shareFile };
}
