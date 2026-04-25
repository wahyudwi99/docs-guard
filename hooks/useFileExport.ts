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
    stripGps: boolean;
    nuclearClean: boolean;
  };
}

export function useFileExport({ 
  canvases, 
  watermarkText, 
  documentType, 
  password, 
  isPro,
  metadataOptions 
}: UseFileExportProps) {
  
  const getPreviewUrls = useCallback(() => {
    if (canvases.length === 0) return [];
    // Only return the first page for preview as requested
    return [canvases[0].toDataURL("image/png", 0.8)];
  }, [canvases]);

  const generateBlobAndFileName = useCallback(async () => {
    if (canvases.length === 0) return null;

    if (documentType === "pdf") {
      const pdf = new jsPDF({
        orientation: canvases[0].width > canvases[0].height ? "l" : "p",
        unit: "px",
        format: [canvases[0].width, canvases[0].height]
      });

      canvases.forEach((canvas, index) => {
        if (index > 0) {
          pdf.addPage([canvas.width, canvas.height], canvas.width > canvas.height ? "l" : "p");
        }
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, canvas.width, canvas.height);
      });

      let pdfBytes = pdf.output("arraybuffer");

      // Apply metadata stripping and password protection if user is Pro
      if (isPro) {
        try {
          const pdfDoc = await PDFDocument.load(pdfBytes);
          
          // Apply metadata stripping if options are provided
          if (metadataOptions) {
            if (metadataOptions.stripAuthor || metadataOptions.nuclearClean) {
              pdfDoc.setAuthor("");
              pdfDoc.setCreator("");
              pdfDoc.setProducer("");
            }
            if (metadataOptions.stripCreationDate || metadataOptions.nuclearClean) {
              pdfDoc.setCreationDate(new Date(0));
              pdfDoc.setModificationDate(new Date(0));
            }
            if (metadataOptions.nuclearClean) {
              pdfDoc.setTitle("");
              pdfDoc.setSubject("");
              pdfDoc.setKeywords([]);
            }
          }

          // Apply password protection if provided
          if (password) {
            // @ts-ignore
            pdfDoc.encrypt({
              userPassword: password,
              ownerPassword: password,
              permissions: {
                printing: "highResolution",
                modifying: false,
                copying: false,
                annotating: false,
                fillingForms: false,
                contentAccessibility: true,
                documentAssembly: false,
              },
            });
          }
          
          pdfBytes = await pdfDoc.save();
        } catch (error) {
          console.error("Error processing PDF (metadata/encryption):", error);
        }
      }

      const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
      const fileName = `docsguard-${watermarkText.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.pdf`;
      return { blob: pdfBlob, fileName, contentType: "application/pdf" };
    } else {
      const canvas = canvases[0];
      const fileName = `docsguard-${watermarkText.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.png`;
      const blob = await new Promise<Blob | null>((resolve) => {
        // PNG export from canvas naturally strips EXIF/GPS metadata
        canvas.toBlob((b) => resolve(b), "image/png", 1.0);
      });
      return { blob, fileName, contentType: "image/png" };
    }
  }, [canvases, watermarkText, documentType, password, isPro, metadataOptions]);

  const saveToDevice = useCallback(async () => {
    const result = await generateBlobAndFileName();
    if (!result || !result.blob) return false;

    const { blob, fileName, contentType } = result;

    try {
      if (!isCapacitorApp()) {
        saveAndOpenBlob(blob, fileName, contentType);
      } else {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const base64Data = (reader.result as string).split(",")[1];
            resolve(base64Data);
          };
          reader.readAsDataURL(blob);
        });

        const base64Data = await base64Promise;
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        });
      }
      return true;
    } catch (error) {
      console.error("Error saving file:", error);
      return false;
    }
  }, [generateBlobAndFileName]);

  const shareFile = useCallback(async () => {
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
