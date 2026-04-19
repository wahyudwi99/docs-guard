"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { Camera, X, Check, RefreshCw, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

interface Point {
  x: number;
  y: number;
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
  
  // 4 points for the crop area (percentage 0-100)
  const [points, setPoints] = useState<Point[]>([
    { x: 10, y: 10 },
    { x: 90, y: 10 },
    { x: 90, y: 90 },
    { x: 10, y: 90 },
  ]);
  const [activePoint, setActivePoint] = useState<number | null>(null);

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

  const handlePointMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (activePoint === null || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

    setPoints(prev => {
      const newPoints = [...prev];
      newPoints[activePoint] = { x, y };
      return newPoints;
    });
  }, [activePoint]);

  const handleConfirm = useCallback(async () => {
    if (capturedImage && canvasRef.current) {
      const img = new Image();
      img.src = capturedImage;
      await new Promise(resolve => img.onload = resolve);

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Calculate bounding box of the 4 points
      const minX = Math.min(...points.map(p => p.x)) / 100 * img.width;
      const minY = Math.min(...points.map(p => p.y)) / 100 * img.height;
      const maxX = Math.max(...points.map(p => p.x)) / 100 * img.width;
      const maxY = Math.max(...points.map(p => p.y)) / 100 * img.height;

      const width = maxX - minX;
      const height = maxY - minY;

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, minX, minY, width, height, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera-crop-${Date.now()}.jpg`, { type: "image/jpeg" });
          stopCamera();
          onCapture(file);
        }
      }, "image/jpeg", 0.95);
    }
  }, [capturedImage, points, onCapture, stopCamera]);

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
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300 select-none">
      <div className="relative w-full max-w-xl bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl flex flex-col aspect-[3/4] md:aspect-video">
        
        {/* Header */}
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
          onMouseMove={handlePointMove}
          onTouchMove={handlePointMove}
          onMouseUp={() => setActivePoint(null)}
          onTouchEnd={() => setActivePoint(null)}
        >
          {capturedImage ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img src={capturedImage} alt="Captured" className="w-full h-full object-contain pointer-events-none" />
              
              {isAdjusting && (
                <div className="absolute inset-0 z-10">
                   <svg className="w-full h-full pointer-events-none">
                      <polygon 
                        points={points.map(p => `${p.x}%,${p.y}%`).join(' ')}
                        className="fill-indigo-500/20 stroke-indigo-500 stroke-2"
                      />
                   </svg>
                   {points.map((p, i) => (
                     <div
                        key={i}
                        onMouseDown={() => setActivePoint(i)}
                        onTouchStart={() => setActivePoint(i)}
                        style={{ left: `${p.x}%`, top: `${p.y}%` }}
                        className={cn(
                          "absolute h-8 w-8 -ml-4 -mt-4 rounded-full border-2 border-white shadow-xl cursor-move pointer-events-auto flex items-center justify-center transition-transform",
                          activePoint === i ? "scale-125 bg-indigo-500 border-indigo-400" : "bg-indigo-600/80"
                        )}
                     >
                       <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
                     </div>
                   ))}
                   <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl text-[10px] font-bold text-white/80 uppercase tracking-widest">
                     {t('upload_section.crop_hint')}
                   </div>
                </div>
              )}
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
        <div className="p-8 flex justify-center items-center gap-8 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 right-0">
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
                className="h-20 w-20 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 hover:bg-indigo-600 transition-all scale-110"
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
