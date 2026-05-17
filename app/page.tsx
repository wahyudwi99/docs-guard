"use client";

import { useCanvas } from "@/hooks/useCanvas";
import { useDocument } from "@/hooks/useDocument";
import { useWatermark } from "@/hooks/useWatermark";
import { useFileExport } from "@/hooks/useFileExport";
import { useSubscription } from "@/hooks/useSubscription";
import Link from "next/link";

import { FileInput } from "@/components/FileInput";
import { CanvasDisplay } from "@/components/CanvasDisplay";
import { WatermarkControls } from "@/components/WatermarkControls";
import { ExportButton } from "@/components/ExportButton";
import { CameraCapture } from "@/components/CameraCapture";
import { Paywall } from "@/components/Paywall";
import { useCallback, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { Shield, FileText, Settings, Plus, Layout, Info, ExternalLink, ChevronRight, Sparkles, Image as ImageIcon, X, Download, CheckCircle2, CreditCard, Zap, Camera, Share2, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";

import { useI18n } from "@/hooks/useI18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { LoginModal } from "@/components/LoginModal";

function HomeContent() {
  const { t, locale } = useI18n();
  const [showSplash, setShowSplash] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const { containerRef, canvases, registerCanvas, clearCanvases } = useCanvas();
  const [activeTab, setActiveTab] = useState<'upload' | 'design' | 'subscription'>('upload');
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const { user: session, loading: isLoadingAuth, logout } = useAuth();
  const { isPro, packages, subscribe } = useSubscription();

  useEffect(() => {
    console.log("Auth Status:", isLoadingAuth ? 'loading' : (session ? 'authenticated' : 'unauthenticated'));
    console.log("Session Data:", session);
  }, [isLoadingAuth, session]);

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  // Close login modal when session is established
  useEffect(() => {
    if (session && showLoginModal) {
      setShowLoginModal(false);
    }
  }, [session, showLoginModal]);
  const [password, setPassword] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle post-login redirection/actions
  useEffect(() => {
    const tab = searchParams.get('tab');
    
    if (tab === 'subscription') {
      setActiveTab('subscription'); 
    }
  }, [searchParams]);

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
    designTab,
    setDesignTab,
    watermarkType,
    setWatermarkType,
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
    watermarkImage,
    setWatermarkImage,
    imageScale,
    setImageScale,
    blurAreas,
    addBlurArea,
    removeBlurArea,
    blurStrength,
    setBlurStrength,
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
    if (file) {
      setActiveTab('design');
      setDesignTab('watermark');
    }
  }, [file, setActiveTab, setDesignTab]);

  const handleNewFile = useCallback(() => {
    clearDocument();
    clearCanvases();
    resetWatermark();
    setPreviewUrls([]);
    setActiveTab('upload');
  }, [clearDocument, clearCanvases, resetWatermark]);

  // File Export logic - Passing canvases array
  const { saveToDevice, shareFile } = useFileExport({ 
    canvases, 
    watermarkText,
    documentType,
    password,
    isPro,
    file
  });

  const handleOpenPreview = useCallback(async () => {
    setIsSaving(true); // Show a loading state if possible
    try {
      // In real-time mode, we don't need preview URLs anymore, 
      // but we keep the handler if needed for logic transition
    } catch (err) {
      console.error("Preview error:", err);
    } finally {
      setIsSaving(false);
    }
  }, [drawWatermark]);


  const handleFinalDownload = useCallback(async () => {
    setIsSaving(true);
    // Ensure all pages are watermarked before saving
    const success = await saveToDevice(() => drawWatermark(false));
    setIsSaving(false);
    
    if (success) {
      setPreviewUrls([]); // Clear preview
      // Show success modal after a short delay to ensure cleanup
      setTimeout(() => setShowSuccessModal(true), 300);
    }
  }, [saveToDevice, drawWatermark]);

  const handleShare = useCallback(async () => {
    setIsSaving(true);
    // Ensure all pages are watermarked before sharing
    const success = await shareFile(() => drawWatermark(false));
    setIsSaving(false);
    
    if (success) {
      setPreviewUrls([]); // Clear preview
    }
  }, [shareFile, drawWatermark]);



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
            <div className="relative h-24 w-24 flex items-center justify-center rounded-[32px] overflow-hidden bg-[#3b82f6] isolation-auto transform-gpu translate-z-0">
              {/* Using a solid background on parent and absolute gradient to mask sub-pixel borders */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#3b82f6] to-[#4f46e5] transform-gpu"></div>
              <Shield className="h-12 w-12 text-white relative z-10" />
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
      <header className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-[0_1px_2px_rgba(0,0,0,0.05)] pt-[env(safe-area-inset-top)]">
        <div className="max-w-5xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3 group transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-indigo-200">
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-bold tracking-tight text-[#1C1C1E]">{t('nav.title')}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!isPro && session && (
               <button 
                onClick={() => setShowPaywall(true)}
                className="hidden sm:flex h-9 px-4 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest hover:bg-amber-200 transition-all active:scale-95 items-center gap-2 border border-amber-200"
              >
                <Zap className="h-3.5 w-3.5 fill-amber-700" />
                Go Pro
              </button>
            )}
            {isLoadingAuth ? (
              <div className="h-9 w-20 bg-slate-100 animate-pulse rounded-full" />
            ) : session ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end leading-none">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-900">{session.name}</span>
                    {session.is_pro && (
                      <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-500">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-[9px] font-black text-white uppercase tracking-wider shadow-lg shadow-orange-100/50 border border-white/20">
                          <Zap className="w-2.5 h-2.5 fill-white mr-0.5" />
                          PRO
                        </span>
                        {session.subscription_end_date && (
                          <span className="text-[8px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200 uppercase tracking-tighter">
                            {session.subscription_type} • {(() => {
                              const end = new Date(session.subscription_end_date);
                              const diff = end.getTime() - new Date().getTime();
                              const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                              return days > 0 ? `${days}d left` : 'Expired';
                            })()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="h-9 px-4 rounded-full bg-rose-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-rose-700 transition-all active:scale-95 flex items-center gap-2 shadow-sm shadow-rose-100"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowLoginModal(true)}
                className="h-9 px-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2"
              >
                <User className="h-3.5 w-3.5" />
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />

      <main className="flex-1 relative z-10 max-w-2xl mx-auto w-full px-4 py-8 md:py-12 flex flex-col items-center">
        <div className="w-full space-y-6">
          {/* Top Verified Privacy Banner */}
          <div className="w-full bg-emerald-50/50 backdrop-blur-md border border-emerald-100/50 rounded-3xl p-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-1000 delay-500">
            <div className="flex gap-4 items-center">
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-400 blur-md opacity-20 animate-pulse"></div>
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 relative z-10" />
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/80">
                    {session ? (
                      <span className="flex items-center gap-1.5 whitespace-nowrap capitalize">
                        Hi, {session.name?.toLowerCase()} <span className="ml-1">👋</span>
                      </span>
                    ) : t('nav.privacy_banner_title')}
                  </span>
                </div>
                {!session ? (
                   <p className="text-xs font-medium text-slate-600 leading-relaxed text-left">
                     {t('nav.privacy_banner')}
                   </p>
                ) : (
                  <p className="text-[10px] font-medium text-slate-500 italic">
                    {t('nav.privacy_banner')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Canvas Processing & Real-time Preview Area */}
          {file && activeTab === 'design' && (
            <div className="w-full mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Layout className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('upload_section.pdf')} / {t('upload_section.image')} Real-time Preview</span>
                </div>
                {designTab === 'blur' && (
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                    {t('watermark_controls.blur_instruction')}
                  </p>
                )}
              </div>
              <CanvasDisplay 
                numPages={numPages} 
                registerCanvas={registerCanvas} 
                isSelectionMode={designTab === 'blur'}
                onAreaSelected={(area) => {
                  addBlurArea(area);
                }}
                blurAreas={blurAreas}
              />
            </div>
          )}


          {/* Main Control Card */}
          <div className="bg-white/80 backdrop-blur-2xl rounded-[32px] p-8 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60">
            <div className="flex flex-col gap-6">
              
              {/* Header Section */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-[#1C1C1E] tracking-tight">{t('nav.tools')}</h2>
                <div className="text-slate-600">
                  <LanguageSwitcher />
                </div>
              </div>

              {/* Tab Switcher */}
              <div className="flex p-1 bg-black/5 rounded-[16px]">
                <button 
                  onClick={() => setActiveTab('upload')}
                  disabled={!!file}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-[12px] text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-40",
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
                  <CreditCard className="h-3.5 w-3.5" />
                  {t('tabs.subscription')}
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
                         <p className="text-xs font-medium text-slate-600 leading-relaxed text-left">
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
                     </div>
                     
                     <WatermarkControls
                        designTab={designTab}
                        setDesignTab={setDesignTab}
                        watermarkType={watermarkType}
                        setWatermarkType={setWatermarkType}
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
                        blurAreas={blurAreas}
                        removeBlurArea={removeBlurArea}
                        blurStrength={blurStrength}
                        setBlurStrength={setBlurStrength}
                        isPro={isPro}
                        documentType={documentType}
                        password={password}
                        setPassword={setPassword}
                     />

                     <div className="pt-4 border-t border-slate-100 flex flex-col gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button 
                            onClick={() => handleShare()}
                            disabled={isSaving}
                            className={cn(
                              "px-4 py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-xl shadow-emerald-100 transition-all active:scale-95 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2",
                              isSaving ? "opacity-70 cursor-not-allowed" : "hover:bg-emerald-600"
                            )}
                          >
                            <Share2 className={cn("h-4 w-4", isSaving && "animate-pulse")} />
                            {isSaving ? t('preview_modal.sharing') : t('preview_modal.share')}
                          </button>
                          <button 
                            onClick={() => handleFinalDownload()}
                            disabled={isSaving}
                            className={cn(
                              "px-4 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 transition-all active:scale-95 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2",
                              isSaving ? "opacity-70 cursor-not-allowed" : "hover:bg-indigo-700"
                            )}
                          >
                            <Download className={cn("h-4 w-4", isSaving && "animate-bounce")} />
                            {isSaving ? t('preview_modal.saving') : `${documentType === 'pdf' ? t('preview_modal.download_pdf') : t('preview_modal.download_png')}`}
                          </button>
                        </div>

                        <button 
                          onClick={handleNewFile}
                          className="w-full py-4 bg-slate-50 text-slate-500 font-bold rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all text-[10px] uppercase tracking-widest"
                        >
                          {t('design_section.remove_file')}
                        </button>
                     </div>

                  </div>
                )}

                {activeTab === 'subscription' && (
                  <div className="space-y-6">
                    <div className={cn(
                      "p-8 rounded-[32px] text-white text-center space-y-4 shadow-xl overflow-hidden relative transition-all duration-700",
                      isPro 
                        ? "bg-gradient-to-br from-amber-400/90 to-amber-500 shadow-amber-200/50" 
                        : "bg-gradient-to-br from-indigo-600 to-violet-700 shadow-xl shadow-indigo-200"
                    )}>
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                         <Zap className="h-24 w-24 fill-white" />
                      </div>
                      <div className={cn(
                        "h-16 w-16 rounded-2xl flex items-center justify-center mx-auto backdrop-blur-md relative z-10",
                        isPro ? "bg-white/30" : "bg-white/20"
                      )}>
                        <Zap className={cn("h-8 w-8 text-amber-300 fill-amber-300", isPro && "animate-pulse")} />
                      </div>
                      <div className="space-y-1 relative z-10">
                        <h3 className="text-xl font-black">
                          {isPro ? `${session?.subscription_type || 'Pro'} Member` : "Go Pro Today"}
                        </h3>
                        <p className={cn("text-xs font-medium", isPro ? "text-amber-50/90" : "text-indigo-100/80")}>
                          {isPro 
                            ? `Active until ${session?.subscription_end_date ? new Date(session.subscription_end_date).toLocaleDateString() : 'forever'}` 
                            : "Choose a plan to unlock all premium tools"}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Available Plans</p>
                       {/* Plan Cards directly in the tab - Sorted by duration */}
                       {[...packages].sort((a: any, b: any) => {
                          const order = ['weekly', 'monthly', 'yearly'];
                          const aType = a.identifier.toLowerCase().includes('weekly') ? 'weekly' : a.identifier.toLowerCase().includes('monthly') ? 'monthly' : 'yearly';
                          const bType = b.identifier.toLowerCase().includes('weekly') ? 'weekly' : b.identifier.toLowerCase().includes('monthly') ? 'monthly' : 'yearly';
                          return order.indexOf(aType) - order.indexOf(bType);
                       }).map((pkg: any) => {
                          const isYearly = pkg.identifier.toLowerCase().includes('yearly') || pkg.packageType === 'ANNUAL' || pkg.packageType === 'YEARLY';
                          const isMonthly = pkg.identifier.toLowerCase().includes('monthly') || pkg.packageType === 'MONTHLY';
                          const isWeekly = pkg.identifier.toLowerCase().includes('weekly') || pkg.packageType === 'WEEKLY';

                          // Robust naming logic
                          let displayName = pkg.product.title;
                          if (!displayName || displayName.trim() === "") {
                            if (isYearly) displayName = "Yearly Pro";
                            else if (isMonthly) displayName = "Monthly Pro";
                            else if (isWeekly) displayName = "Weekly Pro";
                            else displayName = "Premium Plan";
                          }

                          return (
                            <button
                              key={pkg.identifier}
                              onClick={() => {
                                if (!session) {
                                  setShowLoginModal(true);
                                } else {
                                  subscribe(pkg);
                                }
                              }}
                              className={cn(
                                "relative w-full p-5 rounded-3xl text-left transition-all active:scale-[0.98] border-2",
                                isYearly 
                                  ? "bg-indigo-50 border-indigo-200 shadow-sm" 
                                  : "bg-white border-slate-100 hover:border-indigo-200"
                              )}
                            >
                              {isYearly && (
                                <div className="absolute top-2 right-4 px-2 py-0.5 bg-amber-400 text-black text-[8px] font-black uppercase tracking-widest rounded-full shadow-sm z-20">
                                  Best Value
                                </div>
                              )}
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-sm text-slate-900 pr-16">{displayName}</span>
                                <span className="font-black text-lg text-indigo-600 shrink-0">{pkg.product.priceString}</span>
                              </div>
                              <p className="text-[10px] font-medium text-slate-400">
                                {pkg.product.description || (isYearly ? "Save 60% with annual billing" : "No commitment, cancel anytime")}
                              </p>
                            </button>
                          );
                       })}
                    </div>

                    <button 
                      onClick={async () => {
                        const { Preferences } = await import('@capacitor/preferences');
                        if (session) {
                          const updated = { ...session, is_pro: false };
                          await Preferences.set({ key: 'docs_guard_auth_user', value: JSON.stringify(updated) });
                          window.location.reload();
                        }
                      }}
                      className="w-full py-3 bg-rose-50 text-rose-500 font-bold rounded-2xl text-[8px] uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
                    >
                      Reset Pro Status (Dev Only)
                    </button>
                    
                    <div className="grid grid-cols-1 gap-3">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Verified Security</p>
                          <p className="text-[10px] text-slate-400 font-medium">Encryption on every export</p>
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-sm">
                          <Shield className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Total Privacy</p>
                          <p className="text-[10px] text-slate-400 font-medium">No data ever leaves your device</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

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
                <p className="text-xs text-indigo-100 leading-relaxed text-left">
                  {t('info_card.description')}
                </p>
                <div className="pt-2 border-t border-white/20">
                  <p className="text-[10px] text-indigo-200/90 leading-relaxed italic text-left">
                    {t('info_card.privacy_notice')}
                  </p>
                </div>
                <Link href="/privacy" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition-all w-fit">
                  {t('info_card.learn_more')} <ChevronRight className="h-3 w-3" />
                </Link>
             </div>
          </div>
        </div>
      </main>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => setShowSuccessModal(false)}
          ></div>
          <div className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl animate-in zoom-in duration-300 text-center space-y-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 mx-auto">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight text-center">
                {t('preview_modal.success_title')}
              </h3>
              <p className="text-sm font-medium text-slate-500 leading-relaxed text-center">
                {t('preview_modal.success_description')}
              </p>
            </div>
            
            <button 
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold text-sm transition-all shadow-lg"
            >
              {t('preview_modal.close')}
            </button>
          </div>
        </div>
      )}

      {/* Modern Mini Footer */}
      <footer className="w-full py-12 px-6 bg-white border-t border-slate-100 mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2 grayscale opacity-50">
               <Shield className="h-4 w-4" />
               <span className="text-xs font-black tracking-tight uppercase">DocsGuard</span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {t('footer.copyright', { year: new Date().getFullYear() })}
            </p>
          </div>
          <div className="flex gap-8">
            <div className="flex flex-col items-center md:items-end gap-1">
              <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">{t('footer.security_protocol')}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <div className="h-1 w-1 rounded-full bg-emerald-400"></div>
                AES-256 {t('footer.local_first')}
              </span>
            </div>
          </div>
        </div>
      </footer>

      {showPaywall && (
        <Paywall onClose={() => setShowPaywall(false)} />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
