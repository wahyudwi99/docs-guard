import { useCallback } from "react";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { isCapacitorApp, saveAndOpenBlob } from "@/lib/utils";
import { jsPDF } from "jspdf";

interface UseFileExportProps {
  canvases: HTMLCanvasElement[];
  watermarkText: string;
  documentType: "image" | "pdf" | null;
}

export function useFileExport({ canvases, watermarkText, documentType }: UseFileExportProps) {
  
  const getPreviewUrls = useCallback(() => {
    if (canvases.length === 0) return [];
    // Only return the first page for preview as requested
    return [canvases[0].toDataURL("image/png", 0.8)];
  }, [canvases]);

  const saveToDevice = useCallback(async () => {
    if (canvases.length === 0) return false;

    try {
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

        const pdfBlob = pdf.output("blob");
        const fileName = `docsguard-${watermarkText.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.pdf`;
        saveAndOpenBlob(pdfBlob, fileName, "application/pdf");
      } else {
        const canvas = canvases[0];
        const fileName = `docsguard-${watermarkText.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.png`;

        if (!isCapacitorApp()) {
          // Use a Promise to handle toBlob correctly in an async function
          const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((b) => resolve(b), "image/png", 1.0);
          });

          if (blob) {
            saveAndOpenBlob(blob, fileName, "image/png");
          } else {
            throw new Error("Failed to create blob from canvas");
          }
        } else {
          const imageDataUrl = canvas.toDataURL("image/png", 1.0);
          const base64Data = imageDataUrl.split(",")[1];
          await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true,
          });
        }
      }
      return true;
    } catch (error) {
      console.error("Error saving file:", error);
      return false;
    }
  }, [canvases, watermarkText, documentType]);

  return { getPreviewUrls, saveToDevice };
}
