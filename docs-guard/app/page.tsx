"use client";

import { useCanvas } from "@/hooks/useCanvas";
import { useDocument } from "@/hooks/useDocument";
import { useWatermark } from "@/hooks/useWatermark";
import { useFileExport } from "@/hooks/useFileExport";

import { FileInput } from "@/components/FileInput";
import { CanvasDisplay } from "@/components/CanvasDisplay";
import { WatermarkControls } from "@/components/WatermarkControls";
import { ExportButton } from "@/components/ExportButton";
import { useCallback, useEffect, useState } from "react";
import { Shield, FileText, Settings, Download, Plus, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const { canvasRef, context } = useCanvas();
  const canvas = canvasRef.current;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
  } = useWatermark({ context, canvas, redrawDocument });

  // File Export
  const { exportImage } = useFileExport({ canvas, watermarkText });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
              <Shield className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">DocsGuard</span>
          </div>
          <div className="hidden items-center gap-4 md:flex text-sm font-medium text-slate-500">
            <span className="hover:text-indigo-600 cursor-pointer transition-colors">How it works</span>
            <span className="hover:text-indigo-600 cursor-pointer transition-colors">Privacy</span>
            <div className="h-4 w-[1px] bg-slate-200"></div>
            <a href="https://github.com/wahyu/docs-guard" target="_blank" className="hover:text-slate-900 transition-colors">GitHub</a>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className="container mx-auto flex h-full flex-col md:flex-row gap-0 p-0 md:p-6 lg:gap-8">
          {/* Sidebar / Controls Area */}
          <aside className="w-full shrink-0 border-b border-slate-200 bg-white p-4 md:w-80 md:rounded-2xl md:border md:shadow-sm lg:w-96">
            <div className="flex flex-col h-full">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-semibold text-slate-900 text-lg">
                  <Settings className="h-5 w-5 text-indigo-500" />
                  Controls
                </h2>
                {!file && (
                  <div className="flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold uppercase text-indigo-600">
                    <Plus className="h-3 w-3" /> Step 1
                  </div>
                )}
              </div>

              {!file ? (
                <div className="space-y-6">
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm border border-indigo-100">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-900 leading-tight">No document selected</p>
                        <p className="text-xs text-slate-500">Upload a PDF or image to begin watermarking.</p>
                      </div>
                    </div>
                  </div>
                  <FileInput onFileChange={handleFileChange} className="bg-white" />
                </div>
              ) : (
                <div className="flex flex-col gap-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Appearance</p>
                      <button 
                        onClick={() => handleFileChange({ target: { files: null } } as any)} 
                        className="text-xs font-medium text-rose-500 hover:text-rose-600 transition-colors"
                      >
                        Change File
                      </button>
                    </div>
                    <WatermarkControls
                      watermarkText={watermarkText}
                      setWatermarkText={setWatermarkText}
                      watermarkColor={watermarkColor}
                      setWatermarkColor={setWatermarkColor}
                      watermarkOpacity={watermarkOpacity}
                      setWatermarkOpacity={setWatermarkOpacity}
                    />
                  </div>

                  <div className="mt-auto pt-6 border-t border-slate-100">
                    <ExportButton onExport={exportImage} className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100" />
                    <p className="mt-3 text-center text-[10px] text-slate-400">
                      Processing is done locally on your device.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Main Preview Area */}
          <section className="relative flex flex-1 flex-col overflow-hidden bg-slate-100 p-4 md:rounded-2xl md:border md:border-slate-200 md:bg-slate-50 md:shadow-inner min-h-[500px]">
            {!file ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 text-slate-400">
                  <FileText className="h-10 w-10" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Preview Area</h3>
                <p className="max-w-[280px] text-sm text-slate-500">
                  Your document will appear here once uploaded.
                </p>
              </div>
            ) : (
              <div className="flex h-full flex-col">
                <div className="mb-4 flex items-center justify-between text-xs font-medium text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                    Live Preview
                  </div>
                  <div className="flex items-center gap-4">
                    <span>{documentType?.toUpperCase()} format</span>
                    <span>1 page rendered</span>
                  </div>
                </div>
                <div className="flex flex-1 items-center justify-center overflow-auto rounded-xl bg-slate-200/50 p-4 backdrop-blur-sm shadow-inner">
                  <div className="relative shadow-2xl shadow-slate-400/50 transition-transform duration-300 hover:scale-[1.01]">
                    <CanvasDisplay canvasRef={canvasRef} />
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white px-4 py-4 text-center md:px-6">
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} DocsGuard. Secure, local watermarking.
        </p>
      </footer>
    </div>
  );
}
