"use client";

import { useCanvas } from "@/hooks/useCanvas";
import { useDocument } from "@/hooks/useDocument";
import { useWatermark } from "@/hooks/useWatermark";
import { useFileExport } from "@/hooks/useFileExport";

import { FileInput } from "@/components/FileInput";
import { CanvasDisplay } from "@/components/CanvasDisplay";
import { WatermarkControls } from "@/components/WatermarkControls";
import { ExportButton } from "@/components/ExportButton";
import { useCallback, useEffect } from "react";

export default function Home() {
  const { canvasRef, context } = useCanvas();
  const canvas = canvasRef.current;

  // Document management
  const {
    file,
    documentType,
    handleFileChange,
    drawImageOnCanvas,
    drawPdfOnCanvas,
  } = useDocument({ canvas, context });

  // Callback to redraw the current document (image or PDF page)
  const redrawDocument = useCallback(async () => {
    if (!canvas || !context || !file || !documentType) return;

    // Clear the canvas first
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (documentType === "image") {
      await drawImageOnCanvas(file);
    } else if (documentType === "pdf") {
      // For PDF, we need to re-load and re-render the page
      // This might be inefficient for very large PDFs, but adequate for now.
      await drawPdfOnCanvas(file);
    }
  }, [canvas, context, file, documentType, drawImageOnCanvas, drawPdfOnCanvas]);

  // Watermark management
  const {
    watermarkText,
    setWatermarkText,
    watermarkColor,
    setWatermarkColor,
    watermarkOpacity,
    setWatermarkOpacity,
    drawWatermark,
  } = useWatermark({ context, canvas, redrawDocument });

  // File Export
  const { exportImage } = useFileExport({ canvas, watermarkText });

  // Effect to draw watermark whenever document or watermark properties change
  // This is handled within useWatermark's useEffect.

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gray-50">
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
        DocsGuard
      </h1>

      <div className="flex flex-col md:flex-row gap-8 w-full max-w-6xl">
        <div className="flex flex-col gap-4 md:w-1/2">
          <FileInput onFileChange={handleFileChange} />
          {file && (
            <WatermarkControls
              watermarkText={watermarkText}
              setWatermarkText={setWatermarkText}
              watermarkColor={watermarkColor}
              setWatermarkColor={setWatermarkColor}
              watermarkOpacity={watermarkOpacity}
              setWatermarkOpacity={setWatermarkOpacity}
            />
          )}
          {file && <ExportButton onExport={exportImage} className="mt-4" />}
        </div>
        <div className="md:w-1/2 flex justify-center">
          <CanvasDisplay canvasRef={canvasRef} />
        </div>
      </div>
    </main>
  );
}
