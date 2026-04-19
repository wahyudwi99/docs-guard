"use client";

import { useCanvas } from "@/hooks/useCanvas";
import { useDocument } from "@/hooks/useDocument";
import { useWatermark } from "@/hooks/useWatermark";
import { useFileExport } from "@/hooks/useFileExport";
import { useSubscription } from "@/hooks/useSubscription";

import { FileInput } from "@/components/FileInput";
import { CanvasDisplay } from "@/components/CanvasDisplay";
import { WatermarkControls } from "@/components/WatermarkControls";
import { ExportButton } from "@/components/ExportButton";
import { CameraCapture } from "@/components/CameraCapture";
import { useCallback, useState, useEffect } from "react";
import { Shield, FileText, Settings, Plus, Layout, Info, ExternalLink, ChevronRight, Sparkles, Image as ImageIcon, X, Download, CheckCircle2, CreditCard, Zap, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

import { useI18n } from "@/hooks/useI18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function Home() {
  const { t, locale } = useI18n();
  const [showSplash, setShowSplash] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const { containerRef, canvases, registerCanvas, clearCanvases } = useCanvas();
  const [activeTab, setActiveTab] = useState<'upload' | 'design' | 'subscription'>('upload');
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const { isPro, loading: subLoading, subscribe, restorePurchases } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');

  // Splash screen effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setShowSplash(false);
      }, 800); // 800ms for the exit animation
    }, 2200); // Start exit after 2.2s (total ~3s)
    return () => clearTimeout(timer);
  }, []);

  // Document management
  const {
    file,
    documentType,
    numPages,
    error,
    limitExceeded,
    setLimitExceeded,
    handleFileChange,
    clearDocument,
    drawDocumentOnCanvases,
  } = useDocument({ canvases });

  // Callback to redraw the current document (image or PDF pages)
  const redrawDocument = useCallback(async (currentCanvases: HTMLCanvasElement[]) => {
    if (!file || !documentType || currentCanvases.length === 0) return;
    await drawDocumentOnCanvases(file, currentCanvases);
  }, [file, documentType, drawDocumentOnCanvases]);

  // Watermark management
  const {
    watermarkMode,
    setWatermarkMode,
    watermarkLayout,
    setWatermarkLayout,
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
    resetWatermark,
    drawWatermark,
  } = useWatermark({ canvases, redrawDocument });

  const handleFileChangeWithReset = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Renew canvases and state to avoid "canvas already used" error
    clearCanvases();
    resetWatermark();
    setPreviewUrls([]);
    handleFileChange(e);
  }, [handleFileChange, clearCanvases, resetWatermark]);

  const handleCameraCapture = useCallback((capturedFile: File) => {
    // Create a mock event to reuse handleFileChange logic
    const mockEvent = {
      target: {
        files: [capturedFile]
      }
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    
    handleFileChangeWithReset(mockEvent);
    setShowCamera(false);
  }, [handleFileChangeWithReset]);

  // Switch to design tab when file is uploaded
  useEffect(() => {
    if (file) setActiveTab('design');
  }, [file]);

  const handleNewFile = useCallback(() => {
    clearDocument();
    clearCanvases();
    resetWatermark();
    setPreviewUrls([]);
    setActiveTab('upload');
  }, [clearDocument, clearCanvases, resetWatermark]);

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
      {/* Splash Screen Overlay */}
      {showSplash && (
        <div className={cn(
          "fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white transition-all duration-[800ms] ease-in-out pointer-events-none",
          isExiting ? "scale-150 opacity-0 blur-sm" : "scale-100 opacity-100 blur-0"
        )}>
          <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/20 rounded-full blur-[120px]"></div>
          </div>
          
          <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-1000">
            <div className="flex h-24 w-24 items-center justify-center rounded-[32px] bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-2xl shadow-indigo-200">
              <Shield className="h-12 w-12" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-4xl font-black tracking-tighter text-[#1C1C1E]">{t('nav.title')}</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">{t('nav.subtitle')}</p>
            </div>
          </div>
          
          <div className="absolute bottom-12 flex flex-col items-center gap-4">
            <div className="flex gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-600/20"></div>
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-600/40"></div>
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-600/60"></div>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('nav.lab')}</span>
          </div>
        </div>
      )}

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
              <span className="text-lg font-bold tracking-tight text-[#1C1C1E]">{t('nav.title')}</span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{t('nav.subtitle')}</span>
            </div>
          </div>
          <div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10 max-w-2xl mx-auto w-full px-4 py-8 md:py-12 flex flex-col items-center">
        <div className="w-full space-y-6">
          {/* Top Verified Privacy Banner */}
          <div className="w-full bg-emerald-50/50 backdrop-blur-md border border-emerald-100/50 rounded-3xl p-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-1000 delay-500">
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 mt-0.5">
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-400 blur-md opacity-20 animate-pulse"></div>
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 relative z-10" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/80">{t('nav.privacy_banner_title')}</span>
                  <div className="h-1 w-1 rounded-full bg-emerald-300"></div>
                  <span className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest">{t('nav.privacy_banner_subtitle')}</span>
                </div>
                <p className="text-xs font-medium text-slate-600 leading-relaxed">
                  {t('nav.privacy_banner')}
                </p>
              </div>
            </div>
          </div>

          {/* Main Control Card */}
          <div className="bg-white/80 backdrop-blur-2xl rounded-[32px] p-8 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60">
            <div className="flex flex-col gap-6">
              
              {/* Header Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">{t('nav.lab')}</span>
                </div>
                <h2 className="text-2xl font-black text-[#1C1C1E] tracking-tight">{t('nav.tools')}</h2>
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
                  {t('tabs.upload')}
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
                  {t('tabs.design')}
                </button>
                <button 
                  onClick={() => setActiveTab('subscription')}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-[12px] text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2",
                    activeTab === 'subscription' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Zap className={cn("h-3.5 w-3.5", isPro ? "text-amber-500 fill-amber-500" : "")} />
                  {isPro ? t('tabs.pro_active') : t('tabs.go_pro')}
                </button>
              </div>

              {/* Conditional Content */}
              <div className="min-h-[280px] flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500">
                {activeTab === 'upload' && (
                  <div className="space-y-6">
                     <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100/50">
                       <div className="flex gap-3">
                         <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600 shrink-0">
                           <ImageIcon className="h-5 w-5" />
                         </div>
                         <p className="text-xs font-medium text-slate-600 leading-relaxed">
                           {t('upload_section.select_doc')}
                         </p>
                       </div>
                     </div>
                     {error && (
                       <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex gap-3 text-rose-600 animate-in fade-in slide-in-from-top-2 duration-300">
                         <X className="h-5 w-5 shrink-0" />
                         <p className="text-xs font-bold leading-relaxed">{error}</p>
                       </div>
                     )}
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FileInput onFileChange={handleFileChangeWithReset} />
                        
                        <div 
                          onClick={() => setShowCamera(true)}
                          className="group relative flex flex-col items-center justify-center p-10 border-2 border-dashed border-emerald-200/50 rounded-[32px] bg-emerald-50/20 hover:bg-white hover:border-emerald-400 hover:shadow-2xl hover:shadow-emerald-100 transition-all duration-500 ease-in-out cursor-pointer overflow-hidden"
                        >
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-100/30 rounded-full blur-3xl scale-0 group-hover:scale-150 transition-transform duration-700"></div>
                          
                          <div className="relative z-10 flex flex-col items-center justify-center space-y-6 text-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-emerald-500 rounded-2xl blur-xl opacity-0 group-hover:opacity-40 transition-opacity"></div>
                                <div className="relative flex h-20 w-20 items-center justify-center rounded-[24px] bg-white text-emerald-600 shadow-xl border border-emerald-50 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 ease-spring">
                                  <Camera className="w-9 h-9" />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                              <p className="text-[#1C1C1E] text-lg font-black tracking-tight leading-none">
                                {t('upload_section.take_photo')}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {t('upload_section.camera')}
                              </p>
                            </div>
                          </div>
                        </div>
                     </div>

                     {showCamera && (
                       <CameraCapture 
                        onCapture={handleCameraCapture}
                        onClose={() => setShowCamera(false)}
                       />
                     )}
                  </div>
                )}

                {activeTab === 'design' && (
                  <div className="space-y-8">
                     <div className="flex items-center justify-between">
                       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t('design_section.appearance')}</p>
                       <button
                          onClick={handleNewFile}
                          className="text-[10px] font-bold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full hover:bg-rose-100 transition-colors"
                        >
                          {t('design_section.new_file')}
                        </button>                     </div>
                     
                     <WatermarkControls
                        watermarkMode={watermarkMode}
                        setWatermarkMode={setWatermarkMode}
                        watermarkLayout={watermarkLayout}
                        setWatermarkLayout={setWatermarkLayout}
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
                      />
                      <div className="pt-4 space-y-4">
                         <button 
                           onClick={handleOpenPreview}
                           className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700"
                         >
                           <Sparkles className="h-4 w-4" />
                           {t('design_section.generate_preview')}
                         </button>
                         <div className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">{t('design_section.secure_note')}</span>
                         </div>
                      </div>
                  </div>
                )}

                {activeTab === 'subscription' && (
                  <div className="space-y-6">
                    <div className="p-6 rounded-[24px] bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 relative overflow-hidden">
                       <Zap className="absolute -right-4 -top-4 h-24 w-24 text-amber-200/50 -rotate-12" />
                       <div className="relative z-10 space-y-4">
                         <div className="space-y-1">
                           <h3 className="text-lg font-black text-amber-900 tracking-tight">{t('subscription_section.pro_title')}</h3>
                           <p className="text-xs font-medium text-amber-700/80">{t('subscription_section.pro_subtitle')}</p>
                         </div>
                         
                         <div className="space-y-2">
                           {(t('subscription_section.features') as string[]).map((feature, i) => (
                             <div key={i} className="flex items-center gap-2">
                               <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />
                               <span className="text-xs font-bold text-amber-800/70">{feature}</span>
                             </div>
                           ))}
                         </div>

                         {!isPro && (
                           <div className="grid grid-cols-3 gap-2 py-2">
                             {(['weekly', 'monthly', 'yearly'] as const).map((plan) => (
                               <button
                                 key={plan}
                                 onClick={() => setSelectedPlan(plan)}
                                 className={cn(
                                   "flex flex-col items-center gap-1 p-2 rounded-xl border transition-all",
                                   selectedPlan === plan 
                                     ? "bg-amber-100 border-amber-300 ring-2 ring-amber-400/20" 
                                     : "bg-white/50 border-amber-100 hover:bg-white"
                                 )}
                               >
                                 <span className="text-[10px] font-black uppercase text-amber-900/60">{t(`subscription_section.plans.${plan}.title`)}</span>
                                 <span className="text-xs font-bold text-amber-900">{t(`subscription_section.plans.${plan}.price`)}</span>
                               </button>
                             ))}
                           </div>
                         )}

                         <div className="pt-2">
                            {!isPro && (
                              <div className="flex items-baseline gap-1 mb-4 justify-center">
                                <span className="text-3xl font-black text-amber-950">{t(`subscription_section.plans.${selectedPlan}.price`)}</span>
                                <span className="text-xs font-bold text-amber-700/60 uppercase tracking-widest">{t(`subscription_section.plans.${selectedPlan}.period`)}</span>
                              </div>
                            )}

                            {isPro ? (
                              <div className="w-full py-4 bg-amber-500/10 border-2 border-amber-500/20 text-amber-600 font-bold rounded-2xl flex items-center justify-center gap-2">
                                <CheckCircle2 className="h-4 w-4" />
                                {t('subscription_section.active')}
                              </div>
                            ) : (
                              <button
                                onClick={() => subscribe(selectedPlan)}
                                disabled={subLoading}
                                className="w-full py-4 bg-amber-500 text-white font-bold rounded-2xl shadow-xl shadow-amber-200 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-600 disabled:opacity-50"
                              >
                                {subLoading ? (
                                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                  <>
                                    <CreditCard className="h-4 w-4" />
                                    {t('subscription_section.subscribe_now')}
                                  </>
                                )}
                              </button>
                            )}                            
                            <button 
                              onClick={restorePurchases}
                              disabled={subLoading}
                              className="w-full mt-3 py-2 text-[10px] font-bold text-amber-700/60 uppercase tracking-widest hover:text-amber-800 transition-colors"
                            >
                              {t('subscription_section.restore')}
                            </button>
                         </div>
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
                  {t('info_card.how_it_works')}
                </h3>
                <p className="text-xs text-indigo-100 leading-relaxed">
                  {t('info_card.description')}
                </p>
                <div className="pt-2 border-t border-white/20">
                  <p className="text-[10px] text-indigo-200/90 leading-relaxed italic">
                    {t('info_card.privacy_notice')}
                  </p>
                </div>
                <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition-all">
                  {t('info_card.learn_more')} <ChevronRight className="h-3 w-3" />
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
                   <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('preview_modal.ready_title')}</h3>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('preview_modal.preview_note')}</p>
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
                    {t('preview_modal.sample_page')} {index + 1}
                  </div>
                </div>
              ))}
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/80 px-4 py-2 rounded-full shadow-sm">
                {t('preview_modal.all_pages_note', { numPages })}
              </p>
            </div>

            {/* Footer Actions */}
            <div className="p-8 bg-white border-t border-slate-100 flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex flex-col justify-center">
                 <p className="text-sm font-bold text-slate-900">{t('preview_modal.final_verification')}</p>
                 <p className="text-xs font-medium text-slate-400 leading-relaxed">{t('preview_modal.download_note')}</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setPreviewUrls([])}
                  className="px-8 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all active:scale-95 text-xs uppercase tracking-widest"
                >
                  {t('preview_modal.edit_again')}
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
                  {isSaving ? t('preview_modal.saving') : `${documentType === 'pdf' ? t('preview_modal.download_pdf') : t('preview_modal.download_png')}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Mini Footer */}
      {/* Page Limit Exceeded Modal */}
      {limitExceeded && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => setLimitExceeded(false)}
          ></div>
          <div className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl animate-in zoom-in duration-300 text-center space-y-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-50 text-amber-500 mx-auto shadow-sm">
              <Zap className="h-10 w-10 fill-amber-500" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {t('errors.page_limit_exceeded')}
              </h3>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                {t('errors.page_limit_description', { count: '>3' })}
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  setLimitExceeded(false);
                  setActiveTab('subscription');
                }}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
              >
                <Zap className="h-4 w-4 fill-white" />
                Upgrade to Pro
              </button>
              <button 
                onClick={() => setLimitExceeded(false)}
                className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="max-w-5xl mx-auto w-full px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-8 border-t border-slate-200/60 mt-8 relative z-10">
        <div className="flex items-center gap-2 opacity-60">
          <Shield className="h-4 w-4 text-indigo-600" />
          <span className="text-xs font-black tracking-tighter text-[#1C1C1E] uppercase">{t('nav.title')}</span>
        </div>
        <div className="flex flex-col items-center md:items-end gap-2">
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
             {t('footer.copyright', { year: new Date().getFullYear() })}
           </p>
           <div className="flex gap-6">
             <span className="text-[9px] font-black text-slate-300 hover:text-indigo-600 cursor-pointer transition-colors uppercase tracking-widest">{t('footer.security_protocol')}</span>
             <span className="text-[9px] font-black text-slate-300 hover:text-indigo-600 cursor-pointer transition-colors uppercase tracking-widest">{t('footer.local_first')}</span>
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
