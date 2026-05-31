import { useRef, useCallback, useState } from "react";

/**
 * Enhanced hook for memory-safe canvas management.
 * Tracks canvases in a Map to support virtual windowing.
 */
export function useCanvas() {
  const canvasMapRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [, setVersion] = useState(0);

  const registerCanvas = useCallback((el: HTMLCanvasElement | null, index: number) => {
    const current = canvasMapRef.current.get(index);
    
    if (el) {
      if (current === el) return;
      // Mark the element with its index so other hooks can identify it
      el.setAttribute('data-page-index', index.toString());
      canvasMapRef.current.set(index, el);
    } else {
      if (!canvasMapRef.current.has(index)) return;
      canvasMapRef.current.delete(index);
    }
    
    setVersion(v => v + 1);
  }, []);

  const clearCanvases = useCallback(() => {
    canvasMapRef.current.clear();
    setVersion(v => v + 1);
  }, []);

  const canvases = Array.from(canvasMapRef.current.entries())
    .sort((a, b) => a[0] - b[0])
    .map(entry => entry[1]);

  return { 
    containerRef,
    canvases, 
    registerCanvas, 
    clearCanvases 
  };
}
