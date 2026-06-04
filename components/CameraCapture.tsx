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
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
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
      // Capture at full resolution
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 1.0);
        setCapturedImage(dataUrl);
        setIsAdjusting(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!activeHandle) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

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

    const handleUp = () => setActiveHandle(null);

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

      // Crucial Fix: Calculate actual coordinates based on how image fits in viewport
      // The viewport uses 'object-contain', so we need to account for padding
      const container = containerRef.current;
      if (!container) return;

      const containerW = container.clientWidth;
      const containerH = container.clientHeight;
      const imgW = img.width;
      const imgH = img.height;

      const containerRatio = containerW / containerH;
      const imgRatio = imgW / imgH;

      let displayW, displayH, offsetX, offsetY;

      // OBJECT-COVER calculation:
      if (imgRatio > containerRatio) {
        // Image is wider than container
        displayH = containerH;
        displayW = containerH * imgRatio;
        offsetY = 0;
        offsetX = (containerW - displayW) / 2;
      } else {
        // Image is taller than container
        displayW = containerW;
        displayH = containerW / imgRatio;
        offsetX = 0;
        offsetY = (containerH - displayH) / 2;
      }

      // Percentage relative to container -> coordinate relative to image
      const getImgCoord = (percX: number, percY: number) => {
        const xInContainer = (percX / 100) * containerW;
        const yInContainer = (percY / 100) * containerH;
        
        const xInImg = ((xInContainer - offsetX) / displayW) * imgW;
        const yInImg = ((yInContainer - offsetY) / displayH) * imgH;
        
        return { x: xInImg, y: yInImg };
      };

      const tl = getImgCoord(rect.left, rect.top);
      const br = getImgCoord(rect.left + rect.width, rect.top + rect.height);

      const finalX = Math.max(0, tl.x);
      const finalY = Math.max(0, tl.y);
      const finalW = Math.min(imgW - finalX, br.x - tl.x);
      const finalH = Math.min(imgH - finalY, br.y - tl.y);

      canvas.width = finalW;
      canvas.height = finalH;
      ctx.drawImage(img, finalX, finalY, finalW, finalH, 0, 0, finalW, finalH);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera-crop-${Date.now()}.jpg`, { type: "image/jpeg" });
          stopCamera();
          onCapture(file);
        }
      }, "image/jpeg", 0.95);
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
    <div className="fixed inset-0 z-[300] flex flex-col bg-black select-none animate-in fade-in duration-300">
      
      {/* Header - Overlaid */}
      <div className="absolute top-safe pt-8 left-6 right-6 z-[100] flex justify-between items-center">
        <div className="flex items-center gap-2 bg-black/30 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 shadow-2xl">
          {isAdjusting ? <Scissors className="h-4 w-4 text-indigo-400" /> : <Camera className="h-4 w-4 text-emerald-400" />}
          <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white">
            {isAdjusting ? t('upload_section.crop_title') : t('upload_section.camera')}
          </span>
        </div>
        <button 
          onClick={handleClose} 
          className="h-12 w-12 rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all shadow-2xl"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Viewport - Full screen */}
      <div ref={containerRef} className="flex-1 relative bg-black flex items-center justify-center overflow-hidden touch-none">
        {capturedImage ? (
          <div className="relative w-full h-full">
            {/* Use object-cover to match the video preview and remove black bars */}
            <img 
              src={capturedImage} 
              alt="Captured" 
              className="w-full h-full object-cover pointer-events-none opacity-80" 
            />
            
            {isAdjusting && (
              <div 
                className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] z-30"
                style={{ top: `${rect.top}%`, left: `${rect.left}%`, width: `${rect.width}%`, height: `${rect.height}%` }}
              >
                {(['tl', 'tr', 'bl', 'br'] as const).map(h => (
                  <div
                    key={h}
                    onMouseDown={(e) => { e.stopPropagation(); setActiveHandle(h); }}
                    onTouchStart={(e) => { 
                      e.preventDefault(); // Prevent scrolling/stuck on mobile
                      e.stopPropagation(); 
                      setActiveHandle(h); 
                    }}
                    className={cn(
                      "absolute h-20 w-20 flex items-center justify-center pointer-events-auto cursor-move",
                      h === 'tl' && "-top-10 -left-10",
                      h === 'tr' && "-top-10 -right-10",
                      h === 'bl' && "-bottom-10 -left-10",
                      h === 'br' && "-bottom-10 -right-10"
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full border-4 border-white shadow-2xl transition-transform",
                      activeHandle === h ? "scale-125 bg-white" : "bg-indigo-500"
                    )}></div>
                  </div>
                ))}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30 pointer-events-none">
                  <div className="border-r border-b border-white/50"></div><div className="border-r border-b border-white/50"></div><div className="border-b border-white/50"></div>
                  <div className="border-r border-b border-white/50"></div><div className="border-r border-b border-white/50"></div><div className="border-b border-white/50"></div>
                  <div className="border-r border-white/50"></div><div className="border-r border-white/50"></div><div></div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {isStarting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="h-10 w-10 border-4 border-white/10 border-t-white rounded-full animate-spin"></div>
              </div>
            )}
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls - Floating/Overlaid at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-[100] pb-safe p-10 flex justify-center items-center gap-12 bg-gradient-to-t from-black/80 to-transparent">
        {capturedImage ? (
          <>
            <button 
              onClick={handleRetake} 
              className="h-16 w-16 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-2xl active:scale-90"
            >
              <RefreshCw className="h-7 w-7" />
            </button>
            <button 
              onClick={handleConfirm} 
              className="h-20 w-20 rounded-[2.5rem] bg-indigo-500 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/40 hover:bg-indigo-600 transition-all scale-110 active:scale-95"
            >
              <Check className="h-10 w-10 stroke-[3]" />
            </button>
          </>
        ) : (
          <button 
            onClick={capturePhoto} 
            disabled={!stream || isStarting} 
            className="group relative h-24 w-24 rounded-full border-4 border-white p-1.5 transition-all active:scale-90 disabled:opacity-30"
          >
            <div className="h-full w-full rounded-full bg-white transition-all group-hover:scale-95 group-active:scale-90 shadow-2xl shadow-white/20"></div>
            <div className="absolute -inset-4 border-2 border-white/20 rounded-full animate-pulse pointer-events-none" />
          </button>
        )}
      </div>
    </div>
  );
};
