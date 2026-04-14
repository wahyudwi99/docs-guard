import { useRef, useEffect, useState, useCallback } from "react";

/**
 * A custom hook to manage an HTMLCanvasElement and its 2D rendering context.
 * Provides a ref to the canvas and the 2D context.
 *
 * @returns An object containing:
 *  - `canvasRef`: A React ref to the HTMLCanvasElement.
 *  - `context`: The CanvasRenderingContext2D for the canvas.
 *  - `clearCanvas`: A function to clear the canvas.
 *  - `drawWatermark`: A function to draw a watermark on the canvas.
 */
export function useCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const renderContext = canvas.getContext("2d");
      setContext(renderContext);
    }
  }, []);

  const clearCanvas = useCallback(() => {
    if (context && canvasRef.current) {
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [context]);

  /**
   * Draws a watermark on the canvas.
   * @param text The watermark text.
   * @param color The color of the watermark.
   * @param opacity The opacity of the watermark (0-1).
   */
  const drawWatermark = useCallback(
    (text: string, color: string, opacity: number) => {
      if (!context || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = context;

      // Clear previous watermark (if any) by redrawing the base content first
      // This assumption requires the base content to be managed by another hook/function.
      // For now, we just clear and redraw the watermark. A more robust solution
      // would involve re-rendering the base image/pdf page before the watermark.

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.font = `${canvas.width / 15}px Arial`; // Dynamic font size based on canvas width
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const angle = -Math.PI / 4; // -45 degrees
      const gridSize = canvas.width / 3; // Spacing for repeating watermark

      ctx.translate(canvas.width / 2, canvas.height / 2); // Move to center
      ctx.rotate(angle);
      ctx.translate(-canvas.width / 2, -canvas.height / 2); // Move back

      // Draw repeating watermarks
      for (let i = -canvas.width; i < canvas.width * 2; i += gridSize) {
        for (let j = -canvas.height; j < canvas.height * 2; j += gridSize) {
          ctx.fillText(text, i, j);
        }
      }
      ctx.restore();
    },
    [context]
  );

  return { canvasRef, context, clearCanvas, drawWatermark };
}
