import { useRef, useEffect, useState, useCallback } from "react";

export function useCanvas() {
  const [canvases, setCanvases] = useState<HTMLCanvasElement[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const registerCanvas = useCallback((el: HTMLCanvasElement | null, index: number) => {
    if (!el) return; // Ignore null to prevent infinite loops with inline refs
    
    setCanvases(prev => {
      if (prev[index] === el) return prev;
      const newCanvases = [...prev];
      newCanvases[index] = el;
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
