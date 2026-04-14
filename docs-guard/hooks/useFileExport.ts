import { useCallback } from "react";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { isCapacitorApp, saveAndOpenBlob } from "@/lib/utils"; // Assuming a utility to save blob on web

interface UseFileExportProps {
  canvas: HTMLCanvasElement | null;
  watermarkText: string;
}

export function useFileExport({ canvas, watermarkText }: UseFileExportProps) {
  const exportImage = useCallback(async () => {
    if (!canvas) {
      console.error("Canvas is not available for export.");
      return;
    }

    try {
      const imageDataUrl = canvas.toDataURL("image/png", 1.0);
      const fileName = `docsguard-${watermarkText.replace(/\s/g, "_")}-${Date.now()}.png`;

      if (!isCapacitorApp()) {
        // On web, simply download the file
        const blob = await (await fetch(imageDataUrl)).blob();
        saveAndOpenBlob(blob, fileName, "image/png");
      } else {
        // On mobile (iOS/Android), use Capacitor Filesystem
        const base64Data = imageDataUrl.split(",")[1];
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents, // Or Photos, depending on desired location
          recursive: true,
        });
        alert(`Image saved to ${fileName} in Documents folder.`);
      }
    } catch (error) {
      console.error("Error exporting image:", error);
      alert("Failed to export image.");
    }
  }, [canvas, watermarkText]);

  // TODO: Implement export to PDF using jspdf if required in the future
  // const exportPdf = useCallback(async () => { /* ... */ }, [canvas, watermarkText]);

  return { exportImage };
}
