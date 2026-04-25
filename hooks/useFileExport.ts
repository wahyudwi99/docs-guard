import { useCallback } from "react";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { isCapacitorApp, saveAndOpenBlob } from "@/lib/utils";
import { jsPDF } from "jspdf";
import { PDFDocument } from "pdf-lib";

interface UseFileExportProps {
  canvases: HTMLCanvasElement[];
  watermarkText: string;
  documentType: "image" | "pdf" | null;
  password?: string;
  isPro?: boolean;
  metadataOptions?: {
    stripAuthor: boolean;
    stripCreationDate: boolean;
    stripGPS: boolean;
    nuclearClean: boolean;
  };
  file?: File | null;
}

export function useFileExport({ 
  canvases, 
  watermarkText, 
  documentType, 
  password, 
  isPro,
  metadataOptions,
  file
}: UseFileExportProps) {
  
  const getPreviewUrls = useCallback(() => {
    if (canvases.length === 0) return [];
    // Only return the first page for preview as requested
    return [canvases[0].toDataURL("image/png", 0.8)];
  }, [canvases]);

  const generateBlobAndFileName = useCallback(async () => {
    if (canvases.length === 0) return null;

    if (documentType === "pdf") {
      // Use jsPDF encryption as pdf-lib doesn't support it in this version
      const pdfOptions: any = {
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

      // Apply metadata stripping if user is Pro
      if (isPro && metadataOptions) {
        if (metadataOptions.stripAuthor || metadataOptions.nuclearClean) {
          pdf.setProperties({ author: "", creator: "" });
        }
        if (metadataOptions.nuclearClean) {
          pdf.setProperties({ title: "", subject: "", keywords: "" });
        }
      }

      const pdfBlob = pdf.output("blob");
      const fileName = `docsguard-${watermarkText.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.pdf`;
      return { blob: pdfBlob, fileName, contentType: "application/pdf" };
    } else {
      const canvas = canvases[0];
      const isOriginalJpg = file?.type === "image/jpeg" || file?.name.toLowerCase().endsWith(".jpg") || file?.name.toLowerCase().endsWith(".jpeg");
      const exportType = isOriginalJpg ? "image/jpeg" : "image/png";
      const fileExt = isOriginalJpg ? "jpg" : "png";
      
      const fileName = `docsguard-${watermarkText.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.${fileExt}`;
      const blob = await new Promise<Blob | null>((resolve) => {
        // Drawing to canvas and exporting naturally strips all metadata (EXIF/GPS)
        // This satisfies the "Nuclear Clean" and "Strip GPS/Author" requirements
        // Selective metadata retention is not supported as canvas doesn't preserve it.
        canvas.toBlob((b) => resolve(b), exportType, 0.95);
      });
      return { blob, fileName, contentType: exportType };
    }
  }, [canvases, watermarkText, documentType, password, isPro, metadataOptions, file]);

  const saveToDevice = useCallback(async (onBeforeExport?: () => Promise<void>) => {
    try {
      if (onBeforeExport) {
        console.log("Running onBeforeExport...");
        await onBeforeExport();
      }
      
      console.log("Generating blob...");
      const result = await generateBlobAndFileName();
      
      if (!result || !result.blob) {
        console.error("Failed to generate blob result");
        return false;
      }

      const { blob, fileName, contentType } = result;
      console.log(`Blob generated: ${fileName} (${blob.size} bytes), type: ${contentType}`);

      const isNative = isCapacitorApp();
      console.log(`Is Capacitor Native: ${isNative}`);

      if (!isNative) {
        console.log("Triggering web download...");
        saveAndOpenBlob(blob, fileName, contentType);
      } else {
        console.log("Triggering Capacitor file save...");
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
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

        const base64Data = await base64Promise;
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        });
        console.log("Capacitor file saved to Documents");
      }
      return true;
    } catch (error) {
      console.error("Error saving file:", error);
      return false;
    }
  }, [generateBlobAndFileName]);

  const shareFile = useCallback(async (onBeforeExport?: () => Promise<void>) => {
    if (onBeforeExport) await onBeforeExport();
    const result = await generateBlobAndFileName();
    if (!result || !result.blob) return false;

    const { blob, fileName } = result;

    try {
      if (isCapacitorApp()) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });

        const dataUrl = await base64Promise;
        const base64Data = dataUrl.split(",")[1];
        
        // Write file temporarily to Cache directory to be shared
        const tempFilePath = `share_${fileName}`;
        const writeResult = await Filesystem.writeFile({
          path: tempFilePath,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        });

        await Share.share({
          title: "Share Watermarked Document",
          text: `Here is your document: ${watermarkText}`,
          url: writeResult.uri,
          dialogTitle: "Share with",
        });
      } else if (navigator.share) {
        // Web share API
        const file = new File([blob], fileName, { type: blob.type });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "Watermarked Document",
            text: `Document: ${watermarkText}`,
          });
        } else {
          saveAndOpenBlob(blob, fileName, blob.type);
        }
      } else {
        saveAndOpenBlob(blob, fileName, blob.type);
      }
      return true;
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Share cancelled by user");
        return false;
      }
      console.error("Error sharing file:", error);
      return false;
    }
  }, [generateBlobAndFileName, watermarkText]);

  return { getPreviewUrls, saveToDevice, shareFile };
}
