import { useState, useCallback, useEffect, useRef } from "react";

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

  // Offscreen cache to prevent redundant PDF rendering and dimension resets
  const offscreenCanvasesRef = useRef<HTMLCanvasElement[]>([]);
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
    offscreenCanvasesRef.current = [];
  }, []);

  const addBlurArea = useCallback((area: BlurArea) => {
    setBlurAreas(prev => [...prev, area]);
  }, []);

  const removeBlurArea = useCallback((index: number) => {
    setBlurAreas(prev => prev.filter((_, i) => i !== index));
  }, []);

  const applyBlurToContext = useCallback((context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, pageIndex: number) => {
    const pageBlurAreas = blurAreas.filter(a => a.pageIndex === pageIndex);
    if (pageBlurAreas.length === 0) return;

    pageBlurAreas.forEach(area => {
      const ax = Math.floor(area.x);
      const ay = Math.floor(area.y);
      const aw = Math.ceil(area.width);
      const ah = Math.ceil(area.height);

      if (aw <= 0 || ah <= 0) return;

      const privacyFactor = Math.max(0.005, 0.1 - (blurStrength * 0.004)); 
      const tempW = Math.max(1, Math.floor(aw * privacyFactor));
      const tempH = Math.max(1, Math.floor(ah * privacyFactor));
      
      const blurCanvas = document.createElement("canvas");
      blurCanvas.width = tempW;
      blurCanvas.height = tempH;
      const blurCtx = blurCanvas.getContext("2d");
      
      if (blurCtx) {
        blurCtx.imageSmoothingEnabled = true;
        blurCtx.drawImage(canvas, ax, ay, aw, ah, 0, 0, tempW, tempH);
        
        context.save();
        context.beginPath();
        context.rect(ax, ay, aw, ah);
        context.clip();
        
        const iterations = 8; 
        context.globalAlpha = 1.0; 
        context.drawImage(blurCanvas, 0, 0, tempW, tempH, ax, ay, aw, ah);
        
        context.globalAlpha = 0.4;
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "low"; 
        
        for (let i = 0; i < iterations; i++) {
          const angle = (i / iterations) * Math.PI * 2;
          const radius = blurStrength * 0.8;
          const offsetX = Math.cos(angle) * radius;
          const offsetY = Math.sin(angle) * radius;
          context.drawImage(blurCanvas, 0, 0, tempW, tempH, ax + offsetX, ay + offsetY, aw, ah);
        }
        
        context.fillStyle = "rgba(255, 255, 255, 0.1)";
        context.fillRect(ax, ay, aw, ah);
        context.restore();
      }
    });
  }, [blurAreas, blurStrength]);

  const applyWatermarkToContext = useCallback((context: CanvasRenderingContext2D, width: number, height: number) => {
    context.save();
    context.globalAlpha = watermarkOpacity;
    
    let angle = 0;
    if (orientation === "diagonal") angle = -Math.PI / 4;
    else if (orientation === "vertical") angle = -Math.PI / 2;

    context.translate(width / 2, height / 2);
    context.rotate(angle);

    if (watermarkType === "text") {
      context.fillStyle = watermarkColor;
      const responsiveFontSize = (width / 800) * fontSize;
      context.font = `${responsiveFontSize}px ${fontFamily}`;
      context.textAlign = "center";
      context.textBaseline = "middle";

      if (watermarkLayout === "single") {
        context.fillText(watermarkText, 0, 0);
      } else {
        const metrics = context.measureText(watermarkText);
        const spaceWidth = context.measureText("  ").width;
        const textWidth = metrics.width;
        const textHeight = responsiveFontSize;
        
        const horizontalSpacing = textWidth + spaceWidth * 4; 
        const verticalSpacing = textHeight * 4;

        for (let i = -width * 1.5; i < width * 1.5; i += horizontalSpacing) {
          for (let j = -height * 1.5; j < height * 1.5; j += verticalSpacing) {
            context.fillText(watermarkText, i, j);
          }
        }
      }
    } else if (watermarkType === "image" && watermarkImage) {
      const baseWidth = (width / 4) * imageScale;
      const aspectRatio = watermarkImage.height / watermarkImage.width;
      const imgWidth = baseWidth;
      const imgHeight = baseWidth * aspectRatio;

      if (watermarkLayout === "single") {
        context.drawImage(watermarkImage, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
      } else {
        const horizontalSpacing = imgWidth * 2.5;
        const verticalSpacing = imgHeight * 3;

        for (let i = -width * 1.5; i < width * 1.5; i += horizontalSpacing) {
          for (let j = -height * 1.5; j < height * 1.5; j += verticalSpacing) {
            context.drawImage(watermarkImage, i - imgWidth / 2, j - imgHeight / 2, imgWidth, imgHeight);
          }
        }
      }
    }

    context.restore();
  }, [watermarkOpacity, orientation, watermarkType, watermarkColor, fontSize, fontFamily, watermarkLayout, watermarkText, watermarkImage, imageScale]);

  const drawWatermark = useCallback(async (onlyFirstPage = false) => {
    if (canvases.length === 0) return;

    if (documentType === "video") {
      const video = videoRef?.current;
      const canvas = canvases[0];
      const context = canvas.getContext("2d");
      
      if (!video) {
        // Only log once to avoid flooding
        if (renderRequestRef.current % 60 === 0) console.log("[VIDEO] No video element found in ref");
        return;
      }

      if (!context) return;

      if (video.readyState < 2) {
        if (renderRequestRef.current % 60 === 0) console.log(`[VIDEO] Video not ready. readyState: ${video.readyState}`);
        // Optional: draw a loading state or keep previous frame
        return;
      }

      // Sync canvas dimensions
      if (canvas.width !== video.videoWidth && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        console.log(`[VIDEO] Canvas synced to video: ${canvas.width}x${canvas.height}`);
      }

      // Draw the video frame
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Apply watermark (shared logic)
      applyWatermarkToContext(context, canvas.width, canvas.height);
      return;
    }

    const isCachePopulated = offscreenCanvasesRef.current.length === canvases.length && 
                             offscreenCanvasesRef.current.every(c => c.width > 0 && c.width !== 300);

    if (!isCachePopulated) {
      offscreenCanvasesRef.current = canvases.map(() => {
        const off = document.createElement("canvas");
        off.width = 0; 
        off.height = 0;
        return off;
      });
      await redrawDocument(offscreenCanvasesRef.current);
    }

    const pagesToDraw = onlyFirstPage ? canvases.slice(0, 1) : canvases;

    const drawPromises = pagesToDraw.map(async (canvas, index) => {
      const offscreen = offscreenCanvasesRef.current[index];
      if (!offscreen) return;

      const context = canvas.getContext("2d");
      if (!context) return;

      if (canvas.width !== offscreen.width || canvas.height !== offscreen.height) {
        canvas.width = offscreen.width;
        canvas.height = offscreen.height;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(offscreen, 0, 0);

      applyBlurToContext(context, canvas, index);
      applyWatermarkToContext(context, canvas.width, canvas.height);
    });

    await Promise.all(drawPromises);
  }, [canvases, documentType, videoRef, applyWatermarkToContext, redrawDocument, applyBlurToContext]);

  useEffect(() => {
    drawWatermark(false);
  }, [watermarkType, watermarkLayout, watermarkText, watermarkColor, watermarkOpacity, fontFamily, fontSize, orientation, watermarkImage, imageScale, blurAreas, blurStrength, drawWatermark]);

  useEffect(() => {
    if (documentType !== 'video') {
      if (renderRequestRef.current) cancelAnimationFrame(renderRequestRef.current);
      return;
    }

    const loop = () => {
      drawWatermark(true);
      renderRequestRef.current = requestAnimationFrame(loop);
    };

    renderRequestRef.current = requestAnimationFrame(loop);
    return () => {
      if (renderRequestRef.current) cancelAnimationFrame(renderRequestRef.current);
    };
  }, [documentType, drawWatermark]);

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
