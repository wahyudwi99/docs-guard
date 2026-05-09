import { useCallback } from "react";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Media } from "@capacitor-community/media";
import { isCapacitorApp, saveAndOpenBlob } from "@/lib/utils";
import { jsPDF, jsPDFOptions } from "jspdf";

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
      // Use jsPDF encryption as pdf-lib doesn't support it in this version
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

      // AUTOMATIC SILENT PRIVACY: Always strip all identifying metadata by default
      const properties: any = {
        author: " ",
        creator: " ",
        producer: " ",
        title: " ",
        subject: " ",
        keywords: " ",
        creationDate: new Date(0) // Reset to 1970 to strip actual creation time
      };

      pdf.setProperties(properties);

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
        
        // 1. Always save to Filesystem first (Documents folder)
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
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



