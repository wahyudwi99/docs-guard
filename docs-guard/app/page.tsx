"use client";

import { useCanvas } from "@/hooks/useCanvas";
import { useDocument } from "@/hooks/useDocument";
import { useWatermark } from "@/hooks/useWatermark";
import { useFileExport } from "@/hooks/useFileExport";

import { FileInput } from "@/components/FileInput";
import { CanvasDisplay } from "@/components/CanvasDisplay";
import { WatermarkControls } from "@/components/WatermarkControls";
import { ExportButton } from "@/components/ExportButton";
import { useCallback, useState, useEffect } from "react";
import { Shield, FileText, Settings, Plus, Layout, Info, ExternalLink, ChevronRight, Sparkles, Image as ImageIcon, X, Download, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const { containerRef, canvases, registerCanvas, clearCanvases } = useCanvas();
  const [activeTab, setActiveTab] = useState<'upload' | 'design'>( 'upload');
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Document management
  const {
    file,
    documentType,
    numPages,
    error,
    handleFileChange,
    drawDocumentOnCanvases,
  } = useDocument({ canvases });

  // Switch to design tab when file is uploaded
  useEffect(() => {
    if (file) setActiveTab('design');
  }, [file]);

  // Callback to redraw the current document (image or PDF pages)
  const redrawDocument = useCallback(async (currentCanvases: HTMLCanvasElement[]) => {
    if (!file || !documentType || currentCanvases.length === 0) return;
    await drawDocumentOnCanvases(file, currentCanvases);
  }, [file, documentType, drawDocumentOnCanvases]);

  // Watermark management
  const {
    watermarkMode,
    setWatermarkMode,
    watermarkText,
    setWatermarkText,
    watermarkColor,
    setWatermarkColor,
    watermarkOpacity,
    setWatermarkOpacity,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    orientation,
    setOrientation,
    setWatermarkImage,
    imageScale,
    setImageScale,
    drawWatermark,
  } = useWatermark({ canvases, redrawDocument });

  // File Export logic - Passing canvases array
  const { getPreviewUrls, saveToDevice } = useFileExport({ 
    canvases, 
    watermarkText,
    documentType 
  });

  const handleOpenPreview = useCallback(async () => {
    // Ensure everything is drawn before capturing
    await drawWatermark();
    
    const urls = getPreviewUrls();
    if (urls && urls.length > 0) {
      setPreviewUrls(urls);
    } else {
      console.error("Failed to generate Preview URLs");
    }
  }, [getPreviewUrls, drawWatermark]);

  const handleFinalDownload = useCallback(async () => {
    setIsSaving(true);
    const success = await saveToDevice();
    setIsSaving(false);
    if (success) setPreviewUrls([]); // Clear preview after successful download
  }, [saveToDevice]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F7] text-[#1C1C1E] font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Dynamic Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-rose-400/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* iOS Style Navigation Bar */}
      <header className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="max-w-5xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3 group transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-indigo-200">
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-bold tracking-tight text-[#1C1C1E]">DocsGuard</span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Local Privacy</span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
             <a 
              href="https://github.com/wahyudwi99/docs-guard" 
              target="_blank" 
              className="p-2.5 rounded-full bg-black/5 hover:bg-black/10 transition-colors"
            >
              <ExternalLink className="h-5 w-5 text-slate-600" />
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10 max-w-2xl mx-auto w-full px-4 py-8 md:py-12 flex flex-col items-center">
        <div className="w-full space-y-6">
          
          {/* Main Control Card */}
          <div className="bg-white/80 backdrop-blur-2xl rounded-[32px] p-8 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60">
            <div className="flex flex-col gap-6">
              
              {/* Header Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Protection Lab</span>
                </div>
                <h2 className="text-2xl font-black text-[#1C1C1E] tracking-tight">Secure Tools</h2>
              </div>

              {/* Tab Switcher */}
              <div className="flex p-1 bg-black/5 rounded-[16px]">
                <button 
                  onClick={() => setActiveTab('upload')}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-[12px] text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2",
                    activeTab === 'upload' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Upload
                </button>
                <button 
                  onClick={() => file && setActiveTab('design')}
                  disabled={!file}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-[12px] text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-40",
                    activeTab === 'design' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Settings className="h-3.5 w-3.5" />
                  Design
                </button>
              </div>

              {/* Conditional Content */}
              <div className="min-h-[280px] flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500">
                {activeTab === 'upload' ? (
                  <div className="space-y-6">
                     <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100/50">
                       <div className="flex gap-3">
                         <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600 shrink-0">
                           <ImageIcon className="h-5 w-5" />
                         </div>
                         <p className="text-xs font-medium text-slate-600 leading-relaxed">
                           Select a document to begin. Your files are processed locally and never uploaded to any server.
                         </p>
                       </div>
                     </div>
                     {error && (
                       <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex gap-3 text-rose-600 animate-in fade-in slide-in-from-top-2 duration-300">
                         <X className="h-5 w-5 shrink-0" />
                         <p className="text-xs font-bold leading-relaxed">{error}</p>
                       </div>
                     )}
                     <FileInput onFileChange={handleFileChange} />
                  </div>
                ) : (
                  <div className="space-y-8">
                     <div className="flex items-center justify-between">
                       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Appearance</p>
                       <button 
                          onClick={() => window.location.reload()} 
                          className="text-[10px] font-bold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full hover:bg-rose-100 transition-colors"
                        >
                          New File
                        </button>
                     </div>
                     
                     <WatermarkControls
                        watermarkMode={watermarkMode}
                        setWatermarkMode={setWatermarkMode}
                        watermarkText={watermarkText}
                        setWatermarkText={setWatermarkText}
                        watermarkColor={watermarkColor}
                        setWatermarkColor={setWatermarkColor}
                        watermarkOpacity={watermarkOpacity}
                        setWatermarkOpacity={setWatermarkOpacity}
                        fontFamily={fontFamily}
                        setFontFamily={setFontFamily}
                        fontSize={fontSize}
                        setFontSize={setFontSize}
                        orientation={orientation}
                        setOrientation={setOrientation}
                        setWatermarkImage={setWatermarkImage}
                        imageScale={imageScale}
                        setImageScale={setImageScale}
                      />                      <div className="pt-4 space-y-4">
                         <button 
                           onClick={handleOpenPreview}
                           className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700"
                         >
                           <Sparkles className="h-4 w-4" />
                           Generate Preview
                         </button>
                         <div className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">End-to-End Secure</span>
                         </div>
                      </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Hidden Canvas Processing Area */}
          {file && (
            <div className="hidden pointer-events-none opacity-0 absolute -z-50">
              <CanvasDisplay numPages={numPages} registerCanvas={registerCanvas} />
            </div>
          )}

          {/* Info Card */}
          <div className="bg-indigo-600 rounded-[32px] p-6 text-white shadow-xl shadow-indigo-200 overflow-hidden relative group">
             <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-125 transition-transform duration-700">
               <Shield className="h-24 w-24" />
             </div>
             <div className="relative z-10 space-y-4">
                <h3 className="font-bold flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  How it works
                </h3>
                <p className="text-xs text-indigo-100 leading-relaxed">
                  DocsGuard uses browser-based canvas rendering to apply watermarks. This means your data never leaves your computer, ensuring 100% privacy.
                </p>
                <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition-all">
                  Learn More <ChevronRight className="h-3 w-3" />
                </button>
             </div>
          </div>
        </div>
      </main>

      {/* Preview Modal Overlay */}
      {previewUrls.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-lg" 
            onClick={() => setPreviewUrls([])}
          ></div>
          
          {/* Modal Container */}
          <div className="relative w-full max-w-4xl bg-white rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                   <CheckCircle2 className="h-6 w-6" />
                 </div>
                 <div>
                   <h3 className="text-xl font-black text-slate-900 tracking-tight">Ready to Secure</h3>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Preview (First Page Only)</p>
                 </div>
              </div>
              <button 
                onClick={() => setPreviewUrls([])}
                className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-rose-50 hover:text-rose-500 transition-all active:scale-90"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Preview Area */}
            <div className="flex-1 overflow-auto bg-slate-200/50 p-8 flex flex-col items-center gap-8 min-h-[300px] custom-scrollbar">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative shadow-2xl rounded-2xl overflow-hidden bg-white max-w-full">
                  <img 
                    src={url} 
                    alt={`Watermarked Preview Page ${index + 1}`} 
                    className="h-auto w-auto max-w-full block object-contain shadow-sm"
                  />
                  <div className="absolute top-4 right-4 bg-black/50 text-white text-[10px] px-3 py-1 rounded-full backdrop-blur-md font-bold">
                    Sample Page {index + 1}
                  </div>
                </div>
              ))}
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/80 px-4 py-2 rounded-full shadow-sm">
                Watermark will be applied to all {numPages} pages upon download
              </p>
            </div>

            {/* Footer Actions */}
            <div className="p-8 bg-white border-t border-slate-100 flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex flex-col justify-center">
                 <p className="text-sm font-bold text-slate-900">Final Verification</p>
                 <p className="text-xs font-medium text-slate-400 leading-relaxed">Previewing the first page as a sample. Download to apply to all pages.</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setPreviewUrls([])}
                  className="px-8 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all active:scale-95 text-xs uppercase tracking-widest"
                >
                  Edit Again
                </button>
                <button 
                  onClick={handleFinalDownload}
                  disabled={isSaving}
                  className={cn(
                    "px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center gap-2",
                    isSaving ? "opacity-70 cursor-not-allowed" : "hover:bg-indigo-700"
                  )}
                >
                  <Download className={cn("h-4 w-4", isSaving && "animate-bounce")} />
                  {isSaving ? "Saving..." : `Download ${documentType === 'pdf' ? 'PDF' : 'PNG'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Mini Footer */}
      <footer className="max-w-5xl mx-auto w-full px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-8 border-t border-slate-200/60 mt-8 relative z-10">
        <div className="flex items-center gap-2 opacity-60">
          <Shield className="h-4 w-4 text-indigo-600" />
          <span className="text-xs font-black tracking-tighter text-[#1C1C1E] uppercase">DocsGuard</span>
        </div>
        <div className="flex flex-col items-center md:items-end gap-2">
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
             © {new Date().getFullYear()} Build with Privacy by Wahyu
           </p>
           <div className="flex gap-6">
             <span className="text-[9px] font-black text-slate-300 hover:text-indigo-600 cursor-pointer transition-colors uppercase tracking-widest">Security Protocol</span>
             <span className="text-[9px] font-black text-slate-300 hover:text-indigo-600 cursor-pointer transition-colors uppercase tracking-widest">Local-First</span>
           </div>
        </div>
      </footer>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.1);
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes zoom-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        .animate-in {
          animation-duration: 0.3s;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
        }
        
        .fade-in { animation-name: fade-in; }
        .zoom-in { animation-name: zoom-in; }
      `}</style>
    </div>
  );
}
