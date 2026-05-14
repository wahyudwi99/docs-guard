import { useState, useCallback, useEffect, useRef } from "react";

interface UseWatermarkProps {
  canvases: HTMLCanvasElement[];
  // Callback to redraw the base document content before applying watermark
  redrawDocument: (canvases: HTMLCanvasElement[]) => Promise<void>;
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

export function useWatermark({ canvases, redrawDocument }: UseWatermarkProps) {
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

  const drawWatermark = useCallback(async (onlyFirstPage = false) => {
    if (canvases.length === 0) return;

    // 1. Ensure Offscreen Cache is ready
    // We must check if the cache exists AND if it has been populated with actual document dimensions
    // Default canvas size is 300x150, so we check if it's something else or use a more robust check
    const isCachePopulated = offscreenCanvasesRef.current.length === canvases.length && 
                             offscreenCanvasesRef.current.every(c => c.width > 0 && c.width !== 300);

    if (!isCachePopulated) {
      // Create/Reset offscreen canvases with 0 dimensions to ensure they are seen as "not ready"
      offscreenCanvasesRef.current = canvases.map(() => {
        const off = document.createElement("canvas");
        off.width = 0; 
        off.height = 0;
        return off;
      });
      
      // Perform initial render of base document to the offscreen canvases
      // This will set the correct widths/heights
      await redrawDocument(offscreenCanvasesRef.current);
    }

    // Limit pages for preview
    const pagesToDraw = onlyFirstPage ? canvases.slice(0, 1) : canvases;

    const drawPromises = pagesToDraw.map(async (canvas, index) => {
      const offscreen = offscreenCanvasesRef.current[index];
      if (!offscreen) return;

      const context = canvas.getContext("2d");
      if (!context) return;

      // Match dimensions to offscreen (original document size)
      if (canvas.width !== offscreen.width || canvas.height !== offscreen.height) {
        canvas.width = offscreen.width;
        canvas.height = offscreen.height;
      }

      // Clear and draw base document from cache
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(offscreen, 0, 0);

      // Draw blur areas if any
      const pageBlurAreas = blurAreas.filter(a => a.pageIndex === index);
      if (pageBlurAreas.length > 0) {
        pageBlurAreas.forEach(area => {
          // Ensure dimensions are valid and rounded for canvas stability
          const ax = Math.floor(area.x);
          const ay = Math.floor(area.y);
          const aw = Math.ceil(area.width);
          const ah = Math.ceil(area.height);

          if (aw <= 0 || ah <= 0) return;

          // iOS & Privacy-First: Ultra-Obscure Downscale and Stack technique
          // To ensure total privacy (zero legibility), we use an aggressive downscale 
          // combined with a multi-directional smear.
          
          // The higher the blurStrength, the lower the resolution (more pixelated/smeared)
          const privacyFactor = Math.max(0.005, 0.1 - (blurStrength * 0.004)); 
          const tempW = Math.max(1, Math.floor(aw * privacyFactor));
          const tempH = Math.max(1, Math.floor(ah * privacyFactor));
          
          const blurCanvas = document.createElement("canvas");
          blurCanvas.width = tempW;
          blurCanvas.height = tempH;
          const blurCtx = blurCanvas.getContext("2d");
          
          if (blurCtx) {
            // 1. Capture and Obscure via extreme downscaling
            blurCtx.imageSmoothingEnabled = true;
            blurCtx.drawImage(canvas, ax, ay, aw, ah, 0, 0, tempW, tempH);
            
            context.save();
            context.beginPath();
            context.rect(ax, ay, aw, ah);
            context.clip();
            
            // 2. Reconstruction with Multi-Directional Smear (Stacking)
            // We draw the tiny pixels back at large scale with significant offsets
            // to smear any remaining shapes or letterforms.
            const iterations = 8; // Constant high-quality smear
            context.globalAlpha = 1.0; // Reset for initial fill
            
            // Fill with a base layer first to remove any transparency gaps
            context.drawImage(blurCanvas, 0, 0, tempW, tempH, ax, ay, aw, ah);
            
            // Apply semi-transparent smear layers
            context.globalAlpha = 0.4;
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = "low"; // Lower quality actually helps obscuring
            
            for (let i = 0; i < iterations; i++) {
              // Create a circular smear pattern
              const angle = (i / iterations) * Math.PI * 2;
              const radius = blurStrength * 0.8;
              const offsetX = Math.cos(angle) * radius;
              const offsetY = Math.sin(angle) * radius;
              
              context.drawImage(blurCanvas, 0, 0, tempW, tempH, ax + offsetX, ay + offsetY, aw, ah);
            }
            
            // 3. Optional: Add a final slight frost layer to further break up patterns
            context.fillStyle = "rgba(255, 255, 255, 0.1)";
            context.fillRect(ax, ay, aw, ah);
            
            context.restore();
          }
        });
      }

      context.save();
      context.globalAlpha = watermarkOpacity;
      
      let angle = 0;
      if (orientation === "diagonal") angle = -Math.PI / 4;
      else if (orientation === "vertical") angle = -Math.PI / 2;

      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate(angle);

      if (watermarkType === "text") {
        context.fillStyle = watermarkColor;
        const responsiveFontSize = (canvas.width / 800) * fontSize;
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

          for (let i = -canvas.width * 1.5; i < canvas.width * 1.5; i += horizontalSpacing) {
            for (let j = -canvas.height * 1.5; j < canvas.height * 1.5; j += verticalSpacing) {
              context.fillText(watermarkText, i, j);
            }
          }
        }
      } else if (watermarkType === "image" && watermarkImage) {
        const baseWidth = (canvas.width / 4) * imageScale;
        const aspectRatio = watermarkImage.height / watermarkImage.width;
        const imgWidth = baseWidth;
        const imgHeight = baseWidth * aspectRatio;

        if (watermarkLayout === "single") {
          context.drawImage(watermarkImage, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
        } else {
          const horizontalSpacing = imgWidth * 2.5;
          const verticalSpacing = imgHeight * 3;

          for (let i = -canvas.width * 1.5; i < canvas.width * 1.5; i += horizontalSpacing) {
            for (let j = -canvas.height * 1.5; j < canvas.height * 1.5; j += verticalSpacing) {
              context.drawImage(watermarkImage, i - imgWidth / 2, j - imgHeight / 2, imgWidth, imgHeight);
            }
          }
        }
      }

      context.restore();
    });

    await Promise.all(drawPromises);
  }, [canvases, watermarkType, watermarkLayout, watermarkText, watermarkColor, watermarkOpacity, fontFamily, fontSize, orientation, watermarkImage, imageScale, blurAreas, blurStrength, redrawDocument]);

  // Redraw watermark for all pages to support carousel navigation
  useEffect(() => {
    drawWatermark(false);
  }, [watermarkType, watermarkLayout, watermarkText, watermarkColor, watermarkOpacity, fontFamily, fontSize, orientation, watermarkImage, imageScale, blurAreas, blurStrength, drawWatermark]);

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
