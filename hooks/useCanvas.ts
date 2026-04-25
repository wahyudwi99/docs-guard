import { useRef, useEffect, useState, useCallback } from "react";

export function useCanvas() {
  const [canvases, setCanvases] = useState<HTMLCanvasElement[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const registerCanvas = useCallback((el: HTMLCanvasElement | null, index: number) => {
    setCanvases(prev => {
      const newCanvases = [...prev];
      if (el) {
        if (newCanvases[index] === el) return prev;
        newCanvases[index] = el;
      } else {
        // If el is null, it means the component is unmounting
        // We might not want to remove it immediately if we're just re-rendering, 
        // but for safety in index-based management:
        if (!newCanvases[index]) return prev;
        // Don't splice as it shifts indices, just set to undefined or handle carefully
        // Actually, for PDF pages, index is important.
      }
      return newCanvases;
    });
  }, []);

  const clearCanvases = useCallback(() => {
    setCanvases([]);
  }, []);

  return { 
    containerRef, 
    canvases, 
    registerCanvas, 
    clearCanvases 
  };
}
