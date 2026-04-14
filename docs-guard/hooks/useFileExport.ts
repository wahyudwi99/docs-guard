import { useCallback, RefObject } from "react";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { isCapacitorApp, saveAndOpenBlob } from "@/lib/utils";

interface UseFileExportProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  watermarkText: string;
}

export function useFileExport({ canvasRef, watermarkText }: UseFileExportProps) {
  
  const getExportDataUrl = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas current ref is null");
      return null;
    }
    // Force quality 1.0 to ensure image is visible and high quality
    return canvas.toDataURL("image/png", 1.0);
  }, [canvasRef]);

  const saveToDevice = useCallback(async (imageDataUrl: string) => {
    const fileName = `docsguard-${watermarkText.replace(/\s/g, "_")}-${Date.now()}.png`;

    try {
      if (!isCapacitorApp()) {
        // On web
        const blob = await (await fetch(imageDataUrl)).blob();
        saveAndOpenBlob(blob, fileName, "image/png");
      } else {
        // On mobile
        const base64Data = imageDataUrl.split(",")[1];
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        });
        alert(`Image saved to ${fileName} in Documents folder.`);
      }
      return true;
    } catch (error) {
      console.error("Error saving image:", error);
      alert("Failed to save image.");
      return false;
    }
  }, [watermarkText]);

  const exportImage = useCallback(async () => {
    const url = getExportDataUrl();
    if (url) await saveToDevice(url);
  }, [getExportDataUrl, saveToDevice]);

  return { exportImage, getExportDataUrl, saveToDevice };
}
