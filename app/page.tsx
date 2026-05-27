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
import { useCallback, useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { Shield, FileText, Settings, Plus, Layout, Info, ExternalLink, ChevronRight, Sparkles, Image as ImageIcon, X, Download, CheckCircle2, CreditCard, Zap, Camera, Share2, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";

import { useI18n } from "@/hooks/useI18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { LoginModal } from "@/components/LoginModal";
import { motion, AnimatePresence } from 'framer-motion';

function HomeContent() {
  const { t, locale } = useI18n();
  const [showSplash, setShowSplash] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const { containerRef, canvases, registerCanvas, clearCanvases } = useCanvas();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'design' | 'subscription'>('upload');
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const { user: session, loading: isLoadingAuth, logout } = useAuth();
  const { isPro, packages, subscribe, currentPlan, activeEntitlements, subscriptionConflict } = useSubscription();

  const [showConflictModal, setShowConflictModal] = useState(false);

  useEffect(() => {
    if (subscriptionConflict) {
      setShowConflictModal(true);
    }
  }, [subscriptionConflict]);

  useEffect(() => {
    console.log("Auth Status:", isLoadingAuth ? 'loading' : (session ? 'authenticated' : 'unauthenticated'));
    console.log("Session Data:", session);
    console.log("Subscription Status:", isPro ? 'PRO' : 'FREE');
    console.log("Current Plan:", currentPlan);
  }, [isLoadingAuth, session, isPro, currentPlan]);

  const handleLogout = useCallback(async () => {
    await logout();
    // Hard refresh to clear all states and re-trigger splash screen
    window.location.reload();
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
    pdfDoc,
    videoUrl,
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
    await drawDocumentOnCanvases(file, currentCanvases, videoRef.current);
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
  } = useWatermark({ canvases, redrawDocument, documentType, videoRef });

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
      if (documentType === 'video') {
        setDesignTab('watermark');
      }
    }
  }, [file, documentType, setActiveTab, setDesignTab]);

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
      {/* Hidden Video Source for Watermarking */}
      {documentType === 'video' && videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          muted
          loop
          playsInline
          autoPlay
          className="fixed -top-[1000px] -left-[1000px] w-10 h-10 opacity-0 pointer-events-none"
        />
      )}

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
            {/* Tier Status Badge - Always Visible */}
            {!isLoadingAuth && (
              <div className="flex items-center gap-1.5 animate-in fade-in zoom-in duration-700">
                {isPro && session ? (
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center">
                      <Zap className="w-3.5 h-3.5 fill-amber-600 text-amber-600 mr-1" />
                      <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                        PRO
                      </span>
                    </div>
                    {currentPlan?.endDate && (
                      <div className="hidden xs:flex items-center px-2 py-0.5 rounded-full bg-white/80 backdrop-blur-sm border border-amber-100 shadow-sm">
                        <span className="text-[9px] font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-600 uppercase tracking-tighter">
                          Expires: {(() => {
                            const end = new Date(currentPlan.endDate);
                            const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
                            return end.toLocaleDateString('en-GB', options);
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                      FREE
                    </span>
                  </div>
                )}
              </div>
            )}

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
                  <span className="text-[10px] font-bold text-slate-900">{session.name}</span>
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
                  Go Pro
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
                            {isSaving ? t('preview_modal.saving') : 
                              documentType === 'pdf' ? t('preview_modal.download_pdf') : 
                              documentType === 'video' ? 'Download Video' : 
                              t('preview_modal.download_png')
                            }
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
                    {/* Premium Status Card */}
                    <div className={cn(
                      "p-8 rounded-[40px] text-white overflow-hidden relative transition-all duration-700 shadow-2xl",
                      isPro 
                        ? "bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 shadow-amber-200/50 scale-[1.02]" 
                        : "bg-gradient-to-br from-indigo-600 to-violet-700 shadow-indigo-200"
                    )}>
                      {/* Decorative elements */}
                      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                         <Zap className="h-32 w-32 fill-white" />
                      </div>
                      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                      
                      <div className="flex flex-col items-center relative z-10 text-center">
                        <div className={cn(
                          "h-20 w-20 rounded-[28px] flex items-center justify-center mb-6 backdrop-blur-xl border relative shadow-inner",
                          isPro ? "bg-white/30 border-white/40" : "bg-white/10 border-white/20"
                        )}>
                          <Zap className={cn(
                            "h-10 w-10 drop-shadow-md transition-all duration-500", 
                            isPro ? "text-amber-700 fill-amber-700" : "text-amber-300 fill-amber-300"
                          )} />
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="text-2xl font-black tracking-tight leading-none uppercase">
                            {isPro ? "PRO" : "Go Pro Today"}
                          </h3>
                          <div className="h-px w-12 bg-white/30 mx-auto my-4"></div>
                          
                          {isPro ? (
                            <div className="space-y-4">
                              <div className="flex flex-col items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Your Status</span>
                                <div className="px-6 py-2 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-xl">
                                  <span className="text-3xl font-black text-white tracking-tighter">PRO</span>
                                </div>
                                {currentPlan?.endDate && (
                                  <div className="mt-2 px-3 py-1 bg-black/10 backdrop-blur-md rounded-full border border-white/10 shadow-inner">
                                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                                      {(() => {
                                        const end = new Date(currentPlan.endDate);
                                        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
                                        return `Expires: ${end.toLocaleDateString('en-GB', options)}`;
                                      })()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs font-medium text-indigo-100/80 leading-relaxed max-w-[240px] mx-auto">
                              Unlock privacy-first professional tools and process documents without limits.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                         {isPro ? "Upgrade or Switch Plan" : "Choose Your Plan"}
                       </p>
                       
                       {/* Always show Plan Cards - Sorted by duration */}
                       {[...packages].sort((a: any, b: any) => {
                          const order = ['weekly', 'monthly', 'yearly'];
                          const aType = a.identifier.toLowerCase().includes('weekly') ? 'weekly' : a.identifier.toLowerCase().includes('monthly') ? 'monthly' : 'yearly';
                          const bType = b.identifier.toLowerCase().includes('weekly') ? 'weekly' : b.identifier.toLowerCase().includes('monthly') ? 'monthly' : 'yearly';
                          return order.indexOf(aType) - order.indexOf(bType);
                       }).map((pkg: any) => {
                          const isYearly = pkg.identifier.toLowerCase().includes('yearly') || pkg.packageType === 'ANNUAL' || pkg.packageType === 'YEARLY';
                          const isMonthly = pkg.identifier.toLowerCase().includes('monthly') || pkg.packageType === 'MONTHLY';
                          const isWeekly = pkg.identifier.toLowerCase().includes('weekly') || pkg.packageType === 'WEEKLY';

                          // Logic for smart plan labels
                          const pkgType = isWeekly ? 'weekly' : isMonthly ? 'monthly' : 'yearly';
                          const isActive = isPro && currentPlan?.type?.toLowerCase() === pkgType;
                          
                          let buttonLabel = "Subscribe";
                          if (!session) {
                             buttonLabel = "Login to Subscribe";
                          } else if (isActive) {
                             buttonLabel = "Current Plan";
                          } else if (isPro) {
                             const planOrder = ['weekly', 'monthly', 'yearly'];
                             const currentTier = planOrder.indexOf(currentPlan?.type?.toLowerCase() || 'weekly');
                             const pkgTier = planOrder.indexOf(pkgType);
                             buttonLabel = pkgTier > currentTier ? "Upgrade Now" : "Switch Plan";
                          }

                          // Robust naming logic
                          let displayName = pkg.product.title;
                          if (!displayName || displayName.trim() === "") {
                            if (isYearly) displayName = "Yearly Pro";
                            else if (isMonthly) displayName = "Monthly Pro";
                            else if (isWeekly) displayName = "Weekly Pro";
                            else displayName = "Premium Plan";
                          }

                          return (
                            <div key={pkg.identifier} className="relative">
                              <button
                                disabled={isActive}
                                onClick={async () => {
                                  if (!session) {
                                    setShowLoginModal(true);
                                  } else {
                                    const success = await subscribe(pkg);
                                    if (success) {
                                      window.location.reload();
                                    }
                                  }
                                }}
                                className={cn(
                                  "relative w-full p-5 rounded-3xl text-left transition-all active:scale-[0.98] border-2",
                                  isActive 
                                    ? "bg-slate-50 border-amber-300 opacity-90 cursor-default" 
                                    : isYearly 
                                      ? "bg-indigo-50 border-indigo-200 shadow-sm hover:border-indigo-400" 
                                      : "bg-white border-slate-100 hover:border-indigo-200"
                                )}
                              >
                                {isYearly && !isActive && (
                                  <div className="absolute top-2 right-4 px-2 py-0.5 bg-amber-400 text-black text-[8px] font-black uppercase tracking-widest rounded-full shadow-sm z-20">
                                    Best Value
                                  </div>
                                )}
                                {isActive && (
                                  <div className="absolute top-2 right-4 px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-sm z-20 flex items-center gap-1">
                                    <CheckCircle2 className="h-2 w-2" /> Active
                                  </div>
                                )}
                                
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-bold text-sm text-slate-900 pr-16">{displayName}</span>
                                  <span className="font-black text-lg text-indigo-600 shrink-0">{pkg.product.priceString}</span>
                                </div>
                                <p className="text-[10px] font-medium text-slate-400 mb-4">
                                  {pkg.product.description || (isYearly ? "Save 60% with annual billing" : "No commitment, cancel anytime")}
                                </p>
                                
                                <div className={cn(
                                  "w-full py-2 rounded-xl text-center text-[9px] font-black uppercase tracking-widest transition-all",
                                  isActive 
                                    ? "bg-amber-100 text-amber-700 border border-amber-200" 
                                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100"
                                )}>
                                  {buttonLabel}
                                </div>
                              </button>
                            </div>
                          );
                       })}
                       
                       {/* Subscription Logic Information Note */}
                       {isPro && (
                         <div className="mt-4 p-4 rounded-3xl bg-amber-50/80 backdrop-blur-sm border border-amber-200/50 flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-1000">
                           <div className="h-8 w-8 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                             <Info className="h-4 w-4 text-amber-600" />
                           </div>
                           <div className="space-y-1">
                             <p className="text-[11px] font-bold text-amber-900">Subscription Status Note</p>
                             <p className="text-[10px] font-medium text-amber-800/80 leading-relaxed">
                               Your auto-renewal status has been updated. If you've switched plans, please note that you will continue to have full access to your previous plan's benefits until the current billing period expires on the date shown above.
                             </p>
                           </div>
                         </div>
                       )}
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

      {/* Subscription Conflict Modal */}
      <AnimatePresence>
        {showConflictModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
              onClick={() => setShowConflictModal(false)}
            ></motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl text-center space-y-6 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                 <Shield className="h-32 w-32 fill-amber-600" />
              </div>
              
              <div className="h-20 w-20 bg-amber-100 rounded-[28px] flex items-center justify-center mx-auto relative z-10">
                <Info className="h-10 w-10 text-amber-600" />
              </div>
              
              <div className="space-y-2 relative z-10">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Subscription Conflict</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  We found an active subscription on this device, but it is linked to a different account.
                </p>
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 mt-4">
                   <p className="text-[10px] font-medium text-amber-800 text-left">
                     To use premium features on this account, please use the original email address or manage your subscription in iPhone settings.
                   </p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowConflictModal(false)}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg shadow-amber-100 relative z-10"
              >
                I Understand
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
