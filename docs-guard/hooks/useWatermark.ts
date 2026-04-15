import { useState, useCallback, useEffect } from "react";

interface UseWatermarkProps {
  canvases: HTMLCanvasElement[];
  // Callback to redraw the base document content before applying watermark
  redrawDocument: (canvases: HTMLCanvasElement[]) => Promise<void>;
}

type Orientation = "horizontal" | "diagonal" | "vertical";
type WatermarkMode = "text" | "image";

export function useWatermark({ canvases, redrawDocument }: UseWatermarkProps) {
  const [watermarkMode, setWatermarkMode] = useState<WatermarkMode>("text");
  const [watermarkText, setWatermarkText] = useState("DocsGuard");
  const [watermarkColor, setWatermarkColor] = useState("#000000");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState(40);
  const [orientation, setOrientation] = useState<Orientation>("diagonal");
  
  // Image watermark states
  const [watermarkImage, setWatermarkImage] = useState<HTMLImageElement | null>(null);
  const [imageScale, setImageScale] = useState(0.5);

  const drawWatermark = useCallback(async () => {
    if (canvases.length === 0) return;

    // Redraw the base document first to clear any old watermark on all pages
    await redrawDocument(canvases);

    canvases.forEach(canvas => {
      const context = canvas.getContext("2d");
      if (!context) return;

      context.save();
      context.globalAlpha = watermarkOpacity;
      
      // Orientation Logic
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
      } else if (watermarkMode === "image" && watermarkImage) {
        // Calculate image size based on scale and canvas width
        const baseWidth = (canvas.width / 4) * imageScale;
        const aspectRatio = watermarkImage.height / watermarkImage.width;
        const imgWidth = baseWidth;
        const imgHeight = baseWidth * aspectRatio;

        const horizontalSpacing = imgWidth * 2;
        const verticalSpacing = imgHeight * 2.5;

        for (let i = -canvas.width * 2; i < canvas.width * 3; i += horizontalSpacing) {
          for (let j = -canvas.height * 2; j < canvas.height * 3; j += verticalSpacing) {
            context.drawImage(watermarkImage, i - imgWidth / 2, j - imgHeight / 2, imgWidth, imgHeight);
          }
        }
      }

      context.restore();
    });
  }, [canvases, watermarkMode, watermarkText, watermarkColor, watermarkOpacity, fontFamily, fontSize, orientation, watermarkImage, imageScale, redrawDocument]);

  // Redraw watermark whenever its properties or document changes
  useEffect(() => {
    drawWatermark();
  }, [watermarkMode, watermarkText, watermarkColor, watermarkOpacity, fontFamily, fontSize, orientation, watermarkImage, imageScale, drawWatermark]);

  return {
    watermarkMode,
    setWatermarkMode,
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
    drawWatermark,
  };
}
