"use client";

import React, { useRef, useState, useCallback } from "react";
import { Camera, X, Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      
      // Ensure video is ready
      if (video.readyState < 2) return;

      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        setCapturedImage(dataUrl);
        // Don't stop camera immediately to avoid blinking/abrupt UI changes
      }
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (capturedImage) {
      stopCamera();
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: "image/jpeg" });
          onCapture(file);
        });
    }
  }, [capturedImage, onCapture, stopCamera]);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    // Camera is still running if we didn't call stopCamera in capturePhoto
    if (!stream) startCamera();
  }, [startCamera, stream]);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  // Auto-start camera
  React.useEffect(() => {
    startCamera();
    return () => {
      // Cleanup tracks on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]); // Removed stream from dependency to avoid loop

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-xl bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl flex flex-col aspect-[3/4] md:aspect-video">
        {/* Header */}
        <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <Camera className="h-4 w-4 text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">{t('upload_section.camera')}</span>
          </div>
          <button 
            onClick={handleClose}
            className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewport */}
        <div className="flex-1 relative bg-black flex items-center justify-center">
          {capturedImage ? (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-contain animate-in fade-in duration-300" />
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover"
              />
              {isStarting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="h-8 w-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <p className="text-white text-sm font-bold">{error}</p>
                  <button 
                    onClick={startCamera}
                    className="px-6 py-2 bg-white text-black rounded-full font-bold text-xs uppercase tracking-widest"
                  >
                    Retry
                  </button>
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
                className="h-20 w-20 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all scale-110"
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
