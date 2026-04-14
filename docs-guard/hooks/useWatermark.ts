import { useState, useCallback, useEffect } from "react";

interface UseWatermarkProps {
  context: CanvasRenderingContext2D | null;
  canvas: HTMLCanvasElement | null;
  // Callback to redraw the base document content before applying watermark
  redrawDocument: () => Promise<void>;
}

export function useWatermark({ context, canvas, redrawDocument }: UseWatermarkProps) {
  const [watermarkText, setWatermarkText] = useState("DocsGuard");
  const [watermarkColor, setWatermarkColor] = useState("#000000");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);

  const drawWatermark = useCallback(async () => {
    if (!context || !canvas) return;

    // Redraw the base document first to clear any old watermark
    await redrawDocument();

    context.save();
    context.globalAlpha = watermarkOpacity;
    context.fillStyle = watermarkColor;
    context.font = `${canvas.width / 15}px Arial`; // Dynamic font size based on canvas width
    context.textAlign = "center";
    context.textBaseline = "middle";

    const angle = -Math.PI / 4; // -45 degrees
    const gridSize = canvas.width / 3; // Spacing for repeating watermark

    // Translate to center, rotate, and translate back
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(angle);
    context.translate(-canvas.width / 2, -canvas.height / 2);

    // Draw repeating watermarks
    for (let i = -canvas.width; i < canvas.width * 2; i += gridSize) {
      for (let j = -canvas.height; j < canvas.height * 2; j += gridSize) {
        context.fillText(watermarkText, i, j);
      }
    }
    context.restore();
  }, [context, canvas, watermarkText, watermarkColor, watermarkOpacity, redrawDocument]);

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
