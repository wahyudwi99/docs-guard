import { useState, useCallback, useEffect } from "react";

interface UseWatermarkProps {
  canvases: HTMLCanvasElement[];
  // Callback to redraw the base document content before applying watermark
  redrawDocument: (canvases: HTMLCanvasElement[]) => Promise<void>;
}

type Orientation = "horizontal" | "diagonal" | "vertical";
type WatermarkMode = "text" | "image" | "blur";
type WatermarkLayout = "tiled" | "single";

interface BlurArea {
  x: number;
  y: number;
  width: number;
  height: number;
  pageIndex: number;
}

export function useWatermark({ canvases, redrawDocument }: UseWatermarkProps) {
  const [watermarkMode, setWatermarkMode] = useState<WatermarkMode>("text");
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

  const resetWatermark = useCallback(() => {
    setWatermarkMode("text");
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
  }, []);

  const addBlurArea = useCallback((area: BlurArea) => {
    setBlurAreas(prev => [...prev, area]);
  }, []);

  const removeBlurArea = useCallback((index: number) => {
    setBlurAreas(prev => prev.filter((_, i) => i !== index));
  }, []);

  const drawWatermark = useCallback(async () => {
    if (canvases.length === 0) return;

    // Redraw the base document first to clear any old watermark on all pages
    await redrawDocument(canvases);

    // Use Promise.all to ensure all drawing operations are completed
    const drawPromises = canvases.map(async (canvas, canvasIndex) => {
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;

      // Draw blur areas if any
      const pageBlurAreas = blurAreas.filter(a => a.pageIndex === canvasIndex);
      if (pageBlurAreas.length > 0) {
        // Create a temporary canvas to hold the original content for blurring
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d");
        if (tempCtx) {
          // Copy current canvas (original document) to temp
          tempCtx.drawImage(canvas, 0, 0);
          
          pageBlurAreas.forEach(area => {
            context.save();
            context.filter = `blur(${blurStrength}px)`;
            // Draw from tempCanvas to original canvas with blur filter
            context.drawImage(
              tempCanvas, 
              area.x, area.y, area.width, area.height, 
              area.x, area.y, area.width, area.height
            );
            context.restore();
          });
        }
      }

      if (watermarkMode === "blur") return;

      context.save();
      context.globalAlpha = watermarkOpacity;
      
      let angle = 0;
      if (orientation === "diagonal") angle = -Math.PI / 4;
      else if (orientation === "vertical") angle = -Math.PI / 2;

      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate(angle);
      context.translate(-canvas.width / 2, -canvas.height / 2);

      if (watermarkMode === "text") {
        context.fillStyle = watermarkColor;
        const responsiveFontSize = (canvas.width / 800) * fontSize;
        context.font = `${responsiveFontSize}px ${fontFamily}`;
        context.textAlign = "center";
        context.textBaseline = "middle";

        if (watermarkLayout === "single") {
          context.fillText(watermarkText, canvas.width / 2, canvas.height / 2);
        } else {
          const metrics = context.measureText(watermarkText);
          const spaceWidth = context.measureText("  ").width;
          const textWidth = metrics.width;
          const textHeight = responsiveFontSize;
          
          const horizontalSpacing = textWidth + spaceWidth; 
          const verticalSpacing = textHeight * 2.5;

          for (let i = -canvas.width * 2; i < canvas.width * 3; i += horizontalSpacing) {
            for (let j = -canvas.height * 2; j < canvas.height * 3; j += verticalSpacing) {
              context.fillText(watermarkText, i, j);
            }
          }
        }
      } else if (watermarkMode === "image" && watermarkImage) {
        const baseWidth = (canvas.width / 4) * imageScale;
        const aspectRatio = watermarkImage.height / watermarkImage.width;
        const imgWidth = baseWidth;
        const imgHeight = baseWidth * aspectRatio;

        if (watermarkLayout === "single") {
          context.drawImage(watermarkImage, (canvas.width / 2) - (imgWidth / 2), (canvas.height / 2) - (imgHeight / 2), imgWidth, imgHeight);
        } else {
          const horizontalSpacing = imgWidth * 2;
          const verticalSpacing = imgHeight * 2.5;

          for (let i = -canvas.width * 2; i < canvas.width * 3; i += horizontalSpacing) {
            for (let j = -canvas.height * 2; j < canvas.height * 3; j += verticalSpacing) {
              context.drawImage(watermarkImage, i - imgWidth / 2, j - imgHeight / 2, imgWidth, imgHeight);
            }
          }
        }
      }

      context.restore();
    });

    await Promise.all(drawPromises);
  }, [canvases, watermarkMode, watermarkLayout, watermarkText, watermarkColor, watermarkOpacity, fontFamily, fontSize, orientation, watermarkImage, imageScale, blurAreas, blurStrength, redrawDocument]);

  // Redraw watermark whenever its properties or document changes
  useEffect(() => {
    drawWatermark();
  }, [watermarkMode, watermarkLayout, watermarkText, watermarkColor, watermarkOpacity, fontFamily, fontSize, orientation, watermarkImage, imageScale, blurAreas, blurStrength, drawWatermark]);

  return {
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

