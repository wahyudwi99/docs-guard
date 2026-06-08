import { useState, useCallback, useEffect, useRef } from "react";
import { applyWatermarkToContext, applyBlurToContext } from "@/lib/watermark_utils";

interface UseWatermarkProps {
  canvases: HTMLCanvasElement[];
  // Callback to redraw the base document content before applying watermark
  redrawDocument: (canvases: HTMLCanvasElement[]) => Promise<void>;
  documentType?: "image" | "pdf" | "video" | null;
  videoRef?: React.MutableRefObject<HTMLVideoElement | null>;
}

type Orientation = "horizontal" | "diagonal" | "vertical";
type WatermarkMode = "watermark" | "blur" | "password";
type WatermarkType = "text" | "image";
type WatermarkLayout = "tiled" | "single";

interface BlurArea {
  x: number;
  y: number;
  width: number;
  height: number;
  pageIndex: number;
}

export function useWatermark({ canvases, redrawDocument, documentType, videoRef }: UseWatermarkProps) {
  const [designTab, setDesignTab] = useState<WatermarkMode>("watermark");
  const [watermarkType, setWatermarkType] = useState<WatermarkType>("text");
  const [watermarkLayout, setWatermarkLayout] = useState<WatermarkLayout>("tiled");
  const [watermarkText, setWatermarkText] = useState("DocsGuard");
  const [watermarkColor, setWatermarkColor] = useState("#000000");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState(40);
  const [orientation, setOrientation] = useState<Orientation>("diagonal");
  
  // Image watermark states
  const [watermarkImage, setWatermarkImage] = useState<HTMLImageElement | null>(null);
  const [imageScale, setImageScale] = useState(0.5);

  // Blur states
  const [blurAreas, setBlurAreas] = useState<BlurArea[]>([]);
  const [blurStrength, setBlurStrength] = useState(10);

  // Offscreen cache to prevent redundant PDF rendering
  const offscreenCanvasesRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderRequestRef = useRef<number | null>(null);

  const resetWatermark = useCallback(() => {
    setDesignTab("watermark");
    setWatermarkType("text");
    setWatermarkLayout("tiled");
    setWatermarkText("DocsGuard");
    setWatermarkColor("#000000");
    setWatermarkOpacity(0.3);
    setFontFamily("Arial");
    setFontSize(40);
    setOrientation("diagonal");
    setWatermarkImage(null);
    setImageScale(0.5);
    setBlurAreas([]);
    setBlurStrength(10);
    offscreenCanvasesRef.current.clear();
  }, []);

  const addBlurArea = useCallback((area: BlurArea) => {
    setBlurAreas(prev => [...prev, area]);
  }, []);

  const removeBlurArea = useCallback((index: number) => {
    setBlurAreas(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Offscreen cache for the watermark pattern itself
  const watermarkCacheRef = useRef<HTMLCanvasElement | null>(null);

  const internalApplyWatermark = useCallback((context: CanvasRenderingContext2D, width: number, height: number) => {
    if (!watermarkCacheRef.current || 
        watermarkCacheRef.current.width !== width || 
        watermarkCacheRef.current.height !== height) {
      
      const cache = document.createElement("canvas");
      cache.width = width;
      cache.height = height;
      const ctx = cache.getContext("2d");
      
      if (ctx) {
        applyWatermarkToContext(ctx, width, height, {
          text: watermarkText,
          type: watermarkType,
          layout: watermarkLayout,
          color: watermarkColor,
          opacity: watermarkOpacity,
          fontFamily,
          fontSize,
          orientation,
          image: watermarkImage,
          imageScale
        });
        watermarkCacheRef.current = cache;
      }
    }

    if (watermarkCacheRef.current) {
      context.drawImage(watermarkCacheRef.current, 0, 0);
    }
  }, [watermarkOpacity, orientation, watermarkType, watermarkColor, fontSize, fontFamily, watermarkLayout, watermarkText, watermarkImage, imageScale]);

  // Reset cache when any watermark property changes
  useEffect(() => {
    watermarkCacheRef.current = null;
  }, [watermarkOpacity, orientation, watermarkType, watermarkColor, fontSize, fontFamily, watermarkLayout, watermarkText, watermarkImage, imageScale]);

  const drawWatermark = useCallback(async (onlyFirstPage = false) => {
    if (canvases.length === 0) return;

    if (documentType === "video") {
      let video = videoRef?.current;
      if (!video) video = document.querySelector('video');
      const canvas = canvases[0];
      const context = canvas?.getContext("2d");
      if (!video || !context || !canvas) return;

      if (video.paused && video.readyState >= 2) {
        video.play().catch(e => console.warn("[VIDEO] Auto-play blocked:", e));
      }

      if (video.readyState < 2) return;

      if (canvas.width !== video.videoWidth && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Optimization: No need for clearRect when drawing full-frame video
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      internalApplyWatermark(context, canvas.width, canvas.height);
      return;
    }

    // MEMORY-SAFE VIRTUAL RENDERING
    const drawPromises = canvases.map(async (canvas) => {
      const idxAttr = canvas.getAttribute('data-page-index');
      if (!idxAttr) return;
      
      const actualIdx = parseInt(idxAttr);
      let offscreen = offscreenCanvasesRef.current.get(actualIdx);

      // CRITICAL FIX: Ensure both canvases are sized before rendering to break the infinite redraw loop
      if (!offscreen || offscreen.width === 0) {
        offscreen = document.createElement("canvas");
        offscreen.setAttribute('data-page-index', actualIdx.toString());
        offscreenCanvasesRef.current.set(actualIdx, offscreen);
        
        // Initial redraw to get dimensions and base content
        await redrawDocument([offscreen]);
      }

      const context = canvas.getContext("2d");
      if (!context) return;

      // Sync dimensions from offscreen to UI canvas
      if (canvas.width !== offscreen.width || canvas.height !== offscreen.height) {
        canvas.width = offscreen.width;
        canvas.height = offscreen.height;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(offscreen, 0, 0);

      applyBlurToContext(context, offscreen, actualIdx, blurAreas, blurStrength);
      internalApplyWatermark(context, canvas.width, canvas.height);
    });

    await Promise.all(drawPromises);
  }, [canvases, documentType, videoRef, internalApplyWatermark, redrawDocument, blurAreas, blurStrength]);

  useEffect(() => {
    drawWatermark(false);
  }, [watermarkType, watermarkLayout, watermarkText, watermarkColor, watermarkOpacity, fontFamily, fontSize, orientation, watermarkImage, imageScale, blurAreas, blurStrength, drawWatermark]);

  useEffect(() => {
    if (documentType !== 'video') {
      if (renderRequestRef.current) cancelAnimationFrame(renderRequestRef.current);
      return;
    }

    let video = videoRef?.current;
    if (!video) video = document.querySelector('video');
    if (!video) return;

    let isRunning = true;
    const renderLoop = () => {
      if (!isRunning) return;
      drawWatermark(true);
      // requestVideoFrameCallback is a newer Web API
      if (video?.requestVideoFrameCallback) {
        video.requestVideoFrameCallback(renderLoop);
      } else {
        renderRequestRef.current = requestAnimationFrame(renderLoop);
      }
    };

    if (video.requestVideoFrameCallback) {
      video.requestVideoFrameCallback(renderLoop);
    } else {
      renderRequestRef.current = requestAnimationFrame(renderLoop);
    }

    return () => {
      isRunning = false;
      if (renderRequestRef.current) cancelAnimationFrame(renderRequestRef.current);
    };
  }, [documentType, drawWatermark, videoRef]);

  return {
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
  };
}
