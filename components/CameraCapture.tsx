"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { Camera, X, Check, RefreshCw, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Rectangle crop area (percentage 0-100)
  const [rect, setRect] = useState<Rect>({
    top: 15,
    left: 15,
    width: 70,
    height: 70
  });
  
  const [activeHandle, setActiveHandle] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setIsStarting(true);
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Failed to access camera. Please ensure permissions are granted.");
    } finally {
      setIsStarting(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      if (video.readyState < 2) return;

      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        setCapturedImage(dataUrl);
        setIsAdjusting(true);
      }
    }
  }, []);

  // Global move and up handlers to prevent "losing" the handle or shifting on click
  useEffect(() => {
    if (!activeHandle) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      // Calculate percentage relative to viewport
      const x = Math.max(0, Math.min(100, ((clientX - containerRect.left) / containerRect.width) * 100));
      const y = Math.max(0, Math.min(100, ((clientY - containerRect.top) / containerRect.height) * 100));

      setRect(prev => {
        let { top, left, width, height } = prev;
        const right = left + width;
        const bottom = top + height;

        if (activeHandle === 'tl') {
          const newLeft = Math.min(x, right - 5);
          const newTop = Math.min(y, bottom - 5);
          return { top: newTop, left: newLeft, width: right - newLeft, height: bottom - newTop };
        } else if (activeHandle === 'tr') {
          const newRight = Math.max(x, left + 5);
          const newTop = Math.min(y, bottom - 5);
          return { top: newTop, left, width: newRight - left, height: bottom - newTop };
        } else if (activeHandle === 'bl') {
          const newLeft = Math.min(x, right - 5);
          const newBottom = Math.max(y, top + 5);
          return { top, left: newLeft, width: right - newLeft, height: newBottom - top };
        } else if (activeHandle === 'br') {
          const newRight = Math.max(x, left + 5);
          const newBottom = Math.max(y, top + 5);
          return { top, left, width: newRight - left, height: newBottom - top };
        }
        return prev;
      });
    };

    const handleUp = () => {
      setActiveHandle(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [activeHandle]);

  const handleConfirm = useCallback(async () => {
    if (capturedImage && canvasRef.current) {
      const img = new Image();
      img.src = capturedImage;
      await new Promise(resolve => img.onload = resolve);

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const scaleX = img.width / 100;
      const scaleY = img.height / 100;

      const cropX = rect.left * scaleX;
      const cropY = rect.top * scaleY;
      const cropW = rect.width * scaleX;
      const cropH = rect.height * scaleY;

      canvas.width = cropW;
      canvas.height = cropH;
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera-crop-${Date.now()}.jpg`, { type: "image/jpeg" });
          stopCamera();
          onCapture(file);
        }
      }, "image/jpeg", 0.9);
    }
  }, [capturedImage, rect, onCapture, stopCamera]);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setIsAdjusting(false);
    if (!stream) startCamera();
  }, [startCamera, stream]);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [startCamera]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300 select-none">
      <div className="relative w-full max-w-xl bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl flex flex-col aspect-[3/4] md:aspect-video">
        
        {/* Header - Z-Index 20 */}
        <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            {isAdjusting ? <Scissors className="h-4 w-4 text-indigo-400" /> : <Camera className="h-4 w-4 text-emerald-400" />}
            <span className="text-[10px] font-black uppercase tracking-widest text-white">
              {isAdjusting ? t('upload_section.crop_title') : t('upload_section.camera')}
            </span>
          </div>
          <button onClick={handleClose} className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewport */}
        <div 
          ref={containerRef}
          className="flex-1 relative bg-black flex items-center justify-center overflow-hidden touch-none"
        >
          {capturedImage ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img src={capturedImage} alt="Captured" className="w-full h-full object-contain pointer-events-none opacity-50" />
              
              {isAdjusting && (
                <div 
                  className="absolute border-2 border-indigo-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] z-30"
                  style={{ 
                    top: `${rect.top}%`, 
                    left: `${rect.left}%`, 
                    width: `${rect.width}%`, 
                    height: `${rect.height}%` 
                  }}
                >
                  {/* Corner Handles - Larger hit area */}
                  {(['tl', 'tr', 'bl', 'br'] as const).map(h => (
                    <div
                      key={h}
                      onMouseDown={(e) => { e.stopPropagation(); setActiveHandle(h); }}
                      onTouchStart={(e) => { e.stopPropagation(); setActiveHandle(h); }}
                      className={cn(
                        "absolute h-12 w-12 flex items-center justify-center pointer-events-auto cursor-move",
                        h === 'tl' && "-top-6 -left-6",
                        h === 'tr' && "-top-6 -right-6",
                        h === 'bl' && "-bottom-6 -left-6",
                        h === 'br' && "-bottom-6 -right-6"
                      )}
                    >
                      <div className={cn(
                        "h-4 w-4 rounded-full border-2 border-white shadow-xl transition-transform",
                        activeHandle === h ? "scale-125 bg-white" : "bg-indigo-500"
                      )}></div>
                    </div>
                  ))}
                  
                  {/* Visual Guide Grid */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20 pointer-events-none">
                    <div className="border-r border-b border-white"></div>
                    <div className="border-r border-b border-white"></div>
                    <div className="border-b border-white"></div>
                    <div className="border-r border-b border-white"></div>
                    <div className="border-r border-b border-white"></div>
                    <div className="border-b border-white"></div>
                    <div className="border-r border-white"></div>
                    <div className="border-r border-white"></div>
                    <div></div>
                  </div>
                </div>
              )}
              
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600/90 backdrop-blur-md px-4 py-2 rounded-2xl text-[10px] font-bold text-white uppercase tracking-widest z-40">
                {t('upload_section.crop_hint')}
              </div>
            </div>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {isStarting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="h-8 w-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                </div>
              )}
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="relative z-50 p-8 flex justify-center items-center gap-8 bg-black/40 border-t border-white/10">
          {capturedImage ? (
            <>
              <button 
                onClick={handleRetake}
                className="h-16 w-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
              >
                <RefreshCw className="h-6 w-6" />
              </button>
              <button 
                onClick={handleConfirm}
                className="h-20 w-20 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 hover:bg-indigo-600 transition-all scale-110 active:scale-95"
              >
                <Check className="h-10 w-10" />
              </button>
            </>
          ) : (
            <button 
              onClick={capturePhoto}
              disabled={!stream || isStarting}
              className="group h-20 w-20 rounded-full border-4 border-white p-1 transition-all active:scale-95 disabled:opacity-50"
            >
              <div className="h-full w-full rounded-full bg-white transition-all group-hover:scale-90"></div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
