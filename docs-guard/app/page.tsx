"use client";

import { useCanvas } from "@/hooks/useCanvas";
import { useDocument } from "@/hooks/useDocument";
import { useWatermark } from "@/hooks/useWatermark";
import { useFileExport } from "@/hooks/useFileExport";

import { FileInput } from "@/components/FileInput";
import { CanvasDisplay } from "@/components/CanvasDisplay";
import { WatermarkControls } from "@/components/WatermarkControls";
import { ExportButton } from "@/components/ExportButton";
import { useCallback } from "react";

export default function Home() {
  const { canvasRef, context } = useCanvas();
  const canvas = canvasRef.current;

  const {
    file,
    documentType,
    handleFileChange,
    drawImageOnCanvas,
    drawPdfOnCanvas,
  } = useDocument({ canvas, context });

  const redrawDocument = useCallback(async () => {
    if (!canvas || !context || !file || !documentType) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    if (documentType === "image") {
      await drawImageOnCanvas(file);
    } else if (documentType === "pdf") {
      await drawPdfOnCanvas(file);
    }
  }, [canvas, context, file, documentType, drawImageOnCanvas, drawPdfOnCanvas]);

  const {
    watermarkText,
    setWatermarkText,
    watermarkColor,
    setWatermarkColor,
    watermarkOpacity,
    setWatermarkOpacity,
  } = useWatermark({ context, canvas, redrawDocument });

  const { exportImage } = useFileExport({ canvas, watermarkText });

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-blue-100 flex flex-col items-center p-6">
      {/* Header */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-indigo-600">DocsGuard</h1>
        <p className="text-gray-500">Simple. Beautiful. Fast.</p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl p-6">
        {/* Tabs UI (fake for now) */}
        <div className="flex mb-6 rounded-2xl overflow-hidden border">
          <div className="w-1/2 text-center py-3 text-gray-500 bg-gray-100">
            Preview
          </div>
          <div className="w-1/2 text-center py-3 font-semibold bg-indigo-100 text-indigo-600 border-b-4 border-indigo-500">
            Watermark Editor
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Upload File
              </label>
              <FileInput onFileChange={handleFileChange} />
            </div>

            {file && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Watermark Settings
                  </label>
                  <div className="bg-indigo-50 p-4 rounded-xl">
                    <WatermarkControls
                      watermarkText={watermarkText}
                      setWatermarkText={setWatermarkText}
                      watermarkColor={watermarkColor}
                      setWatermarkColor={setWatermarkColor}
                      watermarkOpacity={watermarkOpacity}
                      setWatermarkOpacity={setWatermarkOpacity}
                    />
                  </div>
                </div>

                <button
                  onClick={exportImage}
                  className="w-full py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 shadow-md hover:opacity-90 transition"
                >
                  Export Document
                </button>
              </div>
            )}
          </div>

          {/* Right */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-full bg-gray-50 rounded-2xl p-3 border shadow-inner">
              <CanvasDisplay canvasRef={canvasRef} />
            </div>

            {file && (
              <div className="mt-4 w-full bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                <p className="text-green-600 text-sm tracking-widest">
                  PREVIEW READY
                </p>
                <p className="text-indigo-700 font-bold text-lg mt-1">
                  Your watermark has been applied
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-gray-400 text-sm mt-8">
        © 2026 DocsGuard. Built with Next.js & Tailwind
      </p>
    </main>
  );
}
