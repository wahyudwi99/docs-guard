import React, { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface BlurArea {
  x: number;
  y: number;
  width: number;
  height: number;
  pageIndex: number;
}

interface CanvasDisplayProps {
  numPages: number;
  registerCanvas: (el: HTMLCanvasElement | null, index: number) => void;
  isSelectionMode?: boolean;
  onAreaSelected?: (area: BlurArea) => void;
  blurAreas?: BlurArea[];
}

export const CanvasDisplay: React.FC<CanvasDisplayProps> = ({ 
  numPages, 
  registerCanvas,
  isSelectionMode = false,
  onAreaSelected,
  blurAreas = []
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [activePageIndex, setActivePageIndex] = useState<number | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, pageIndex: number) => {
    if (!isSelectionMode) return;
    
    setIsDragging(true);
    setActivePageIndex(pageIndex);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    setStartPos({ x, y });
    setCurrentPos({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || activePageIndex === null) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // We need to get the rect of the active canvas
    const canvases = containerRef.current?.querySelectorAll('canvas');
    if (!canvases || !canvases[activePageIndex]) return;
    
    const rect = canvases[activePageIndex].getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    
    setCurrentPos({ x, y });
  };

  const handleMouseUp = () => {
    if (!isDragging || activePageIndex === null || !onAreaSelected) {
      setIsDragging(false);
      setActivePageIndex(null);
      return;
    }

    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);
    
    // Only add if area is significant
    if (width > 5 && height > 5) {
      const x = Math.min(startPos.x, currentPos.x);
      const y = Math.min(startPos.y, currentPos.y);
      
      // We need to scale the coordinates back to the actual canvas resolution
      const canvases = containerRef.current?.querySelectorAll('canvas');
      if (canvases && canvases[activePageIndex]) {
        const canvas = canvases[activePageIndex];
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        onAreaSelected({
          x: x * scaleX,
          y: y * scaleY,
          width: width * scaleX,
          height: height * scaleY,
          pageIndex: activePageIndex
        });
      }
    }
    
    setIsDragging(false);
    setActivePageIndex(null);
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex flex-col gap-6 w-full max-h-[70vh] overflow-y-auto custom-scrollbar p-4 bg-slate-100/50 rounded-xl",
        isSelectionMode && "cursor-crosshair"
      )}
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleMouseUp}
    >
      {Array.from({ length: numPages }).map((_, index) => (
        <div 
          key={index} 
          className="relative w-full flex justify-center bg-white shadow-lg rounded-lg overflow-hidden border border-slate-200"
          onMouseDown={(e) => handleMouseDown(e, index)}
          onTouchStart={(e) => handleMouseDown(e, index)}
        >
          <canvas
            ref={(el) => registerCanvas(el, index)}
            className="max-w-full h-auto"
          />
          
          {/* Selection Overlay */}
          {activePageIndex === index && isDragging && (
            <div 
              className="absolute border-2 border-indigo-500 bg-indigo-500/20 pointer-events-none"
              style={{
                left: Math.min(startPos.x, currentPos.x),
                top: Math.min(startPos.y, currentPos.y),
                width: Math.abs(currentPos.x - startPos.x),
                height: Math.abs(currentPos.y - startPos.y),
              }}
            />
          )}

          {/* Existing Blur Areas visualization */}
          {blurAreas.filter(a => a.pageIndex === index).map((area, i) => {
            const canvas = containerRef.current?.querySelectorAll('canvas')[index];
            if (!canvas) return null;
            
            const rect = canvas.getBoundingClientRect();
            const scaleX = rect.width / canvas.width;
            const scaleY = rect.height / canvas.height;
            
            return (
              <div 
                key={i}
                className="absolute border border-dashed border-rose-400 bg-rose-400/10 pointer-events-none"
                style={{
                  left: area.x * scaleX,
                  top: area.y * scaleY,
                  width: area.width * scaleX,
                  height: area.height * scaleY,
                }}
              >
                <div className="absolute -top-4 -left-px bg-rose-400 text-white text-[8px] px-1 font-bold rounded-t">
                  Blur {i + 1}
                </div>
              </div>
            );
          })}

          <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-md">
            Page {index + 1}
          </div>
        </div>
      ))}
    </div>
  );
};
