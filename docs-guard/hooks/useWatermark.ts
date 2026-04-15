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
      context.font = `${canvas.width / 15}px Arial`;
      context.textAlign = "center";
      context.textBaseline = "middle";

      const angle = -Math.PI / 4;
      const gridSize = canvas.width / 3;

      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate(angle);
      context.translate(-canvas.width / 2, -canvas.height / 2);

      for (let i = -canvas.width; i < canvas.width * 2; i += gridSize) {
        for (let j = -canvas.height; j < canvas.height * 2; j += gridSize) {
          context.fillText(watermarkText, i, j);
        }
      }
      context.restore();
    });
  }, [canvases, watermarkText, watermarkColor, watermarkOpacity, redrawDocument]);

  // Redraw watermark whenever its properties or document changes
  useEffect(() => {
    drawWatermark();
  }, [watermarkText, watermarkColor, watermarkOpacity, drawWatermark]);

  return {
    watermarkText,
    setWatermarkText,
    watermarkColor,
    setWatermarkColor,
    watermarkOpacity,
    setWatermarkOpacity,
    drawWatermark,
  };
}
