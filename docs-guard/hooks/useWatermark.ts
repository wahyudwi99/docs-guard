import { useState, useCallback, useEffect } from "react";

interface UseWatermarkProps {
  canvases: HTMLCanvasElement[];
  // Callback to redraw the base document content before applying watermark
  redrawDocument: (canvases: HTMLCanvasElement[]) => Promise<void>;
}

export function useWatermark({ canvases, redrawDocument }: UseWatermarkProps) {
  const [watermarkText, setWatermarkText] = useState("DocsGuard");
  const [watermarkColor, setWatermarkColor] = useState("#000000");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState(40); // Base font size

  const drawWatermark = useCallback(async () => {
    if (canvases.length === 0) return;

    // Redraw the base document first to clear any old watermark on all pages
    await redrawDocument(canvases);

    canvases.forEach(canvas => {
      const context = canvas.getContext("2d");
      if (!context) return;

      context.save();
      context.globalAlpha = watermarkOpacity;
      context.fillStyle = watermarkColor;
      
      // Responsive font size based on canvas width vs base size
      const responsiveFontSize = (canvas.width / 800) * fontSize;
      context.font = `${responsiveFontSize}px ${fontFamily}`;
      context.textAlign = "center";
      context.textBaseline = "middle";

      const angle = -Math.PI / 4;
      
      // Calculate text metrics to avoid overlap
      const metrics = context.measureText(watermarkText);
      const spaceWidth = context.measureText("  ").width; // Exact 2 spaces width
      const textWidth = metrics.width;
      const textHeight = responsiveFontSize;
      
      // Extremely tight but safe spacing
      const horizontalSpacing = textWidth + spaceWidth; 
      const verticalSpacing = textHeight * 2.5; // Enough for 3+ lines on any standard page

      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate(angle);
      context.translate(-canvas.width / 2, -canvas.height / 2);

      // Draw repeating watermarks with dynamic spacing
      for (let i = -canvas.width * 2; i < canvas.width * 3; i += horizontalSpacing) {
        for (let j = -canvas.height * 2; j < canvas.height * 3; j += verticalSpacing) {
          context.fillText(watermarkText, i, j);
        }
      }
      context.restore();
    });
  }, [canvases, watermarkText, watermarkColor, watermarkOpacity, fontFamily, fontSize, redrawDocument]);

  // Redraw watermark whenever its properties or document changes
  useEffect(() => {
    drawWatermark();
  }, [watermarkText, watermarkColor, watermarkOpacity, fontFamily, fontSize, drawWatermark]);

  return {
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
    drawWatermark,
  };
}
