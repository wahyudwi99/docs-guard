import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Hash } from "lucide-react";

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
  documentType?: "image" | "pdf" | "video" | null;
}

/**
 * Individual Page component with stable ref handling
 */
const CanvasPage: React.FC<{
  index: number;
  isActive: boolean;
  shouldRender: boolean;
  registerCanvas: (el: HTMLCanvasElement | null, index: number) => void;
  isDragging: boolean;
  startPos: { x: number, y: number };
  currentPos: { x: number, y: number };
  blurAreas: BlurArea[];
  onMouseDown: (e: React.MouseEvent | React.TouchEvent) => void;
  onMouseMove: (e: React.MouseEvent | React.TouchEvent) => void;
  onMouseUp: (e: React.MouseEvent | React.TouchEvent) => void;
  documentType?: "image" | "pdf" | "video" | null;
}> = React.memo(({ 
  index, isActive, shouldRender, registerCanvas, 
  isDragging, startPos, currentPos, blurAreas,
  onMouseDown, onMouseMove, onMouseUp,
  documentType
}) => {
  const pageRef = useRef<HTMLDivElement>(null);
  
  const canvasRef = useCallback((el: HTMLCanvasElement | null) => {
    registerCanvas(el, index);
  }, [registerCanvas, index]);

  // Filter blur areas for this specific page
  const pageBlurAreas = blurAreas.filter(a => a.pageIndex === index);

  return (
    <div 
      ref={pageRef}
      className={cn(
        "relative w-fit flex justify-center bg-white shadow-2xl rounded-2xl overflow-hidden border border-slate-200 transition-all duration-500 ease-in-out absolute touch-none select-none",
        isActive 
          ? "opacity-100 scale-100 z-10 translate-x-0" 
          : "opacity-0 scale-90 -z-10 pointer-events-none",
        documentType === 'video' && "max-h-[70vh]"
      )}
      onMouseDown={onMouseDown}
      onTouchStart={onMouseDown}
      onMouseMove={onMouseMove}
      onTouchMove={onMouseMove}
      onMouseUp={onMouseUp}
      onTouchEnd={onMouseUp}
    >
      {shouldRender && (
        <canvas
          ref={canvasRef}
          className={cn(
            "max-w-full h-auto block",
            documentType === 'video' ? "bg-black" : "bg-white"
          )}
          style={documentType === 'video' ? { minWidth: '300px', minHeight: '200px' } : {}}
        />
      )}

      {/* Selection Overlay */}
      {isActive && isDragging && (
        <div 
          className="absolute border-2 border-indigo-500 bg-indigo-500/20 pointer-events-none z-30"
          style={{
            left: Math.min(startPos.x, currentPos.x),
            top: Math.min(startPos.y, currentPos.y),
            width: Math.abs(currentPos.x - startPos.x),
            height: Math.abs(currentPos.y - startPos.y),
          }}
        />
      )}

      {/* Existing Blur Areas Visualization */}
      {isActive && pageBlurAreas.map((area, i) => {
        const canvas = pageRef.current?.querySelector('canvas');
        if (!canvas) return null;

        const percX = (area.x / canvas.width) * 100;
        const percY = (area.y / canvas.height) * 100;
        const percW = (area.width / canvas.width) * 100;
        const percH = (area.height / canvas.height) * 100;

        return (
          <div 
            key={i}
            className="absolute border-2 border-dashed border-rose-500/50 bg-rose-500/10 pointer-events-none z-20"
            style={{
              left: `${percX}%`,
              top: `${percY}%`,
              width: `${percW}%`,
              height: `${percH}%`,
            }}
          >
            <div className="absolute -top-5 left-0 bg-rose-500 text-white text-[9px] px-1.5 py-0.5 font-bold rounded-sm whitespace-nowrap shadow-sm">
              Sensor {i + 1}
            </div>
          </div>
        );
      })}
    </div>
  );
});

CanvasPage.displayName = "CanvasPage";

export const CanvasDisplay: React.FC<CanvasDisplayProps> = ({ 
  numPages, 
  registerCanvas,
  isSelectionMode = false,
  onAreaSelected,
  blurAreas = [],
  documentType
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  const handleNext = () => {
    if (currentPage < numPages - 1) setCurrentPage(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentPage > 0) setCurrentPage(prev => prev - 1);
  };

  const handleJumpToPage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentPage(parseInt(e.target.value));
  };

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isSelectionMode) return;

    // Use currentTarget to get the specific page div's relative coordinates
    const rect = e.currentTarget.getBoundingClientRect();
    setIsDragging(true);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    setStartPos({ x, y });
    setCurrentPos({ x, y });
  }, [isSelectionMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    setCurrentPos({ x, y });
  }, [isDragging]);

  const handleMouseUp = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !onAreaSelected) {
      setIsDragging(false);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const canvas = e.currentTarget.querySelector('canvas');
    
    if (rect && canvas) {
      // Scale from UI pixels to physical canvas pixels
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const x = Math.min(startPos.x, currentPos.x);
      const y = Math.min(startPos.y, currentPos.y);
      const width = Math.abs(currentPos.x - startPos.x);
      const height = Math.abs(currentPos.y - startPos.y);

      const finalX = Math.max(0, Math.min(x, rect.width)) * scaleX;
      const finalY = Math.max(0, Math.min(y, rect.height)) * scaleY;
      const finalWidth = Math.min(width, rect.width - Math.max(0, x)) * scaleX;
      const finalHeight = Math.min(height, rect.height - Math.max(0, y)) * scaleY;

      if (finalWidth > 5 && finalHeight > 5) {
        onAreaSelected({
          x: finalX,
          y: finalY,
          width: finalWidth,
          height: finalHeight,
          pageIndex: currentPage
        });
      }
    }

    setIsDragging(false);
  }, [isDragging, onAreaSelected, startPos, currentPos, currentPage]);

  // Effect to add non-passive touchmove listener to the container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
      }
    };

    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isDragging]);

  return (
    <div className="w-full space-y-4">
      {/* Navigation Controls */}
      <div className="flex items-center justify-between bg-white/50 backdrop-blur-md p-3 rounded-2xl border border-black/5 shadow-sm">
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrev}
            disabled={currentPage === 0}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all active:scale-90"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 px-3 h-9 bg-white border border-slate-200 rounded-xl">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page</span>
            <span className="text-xs font-bold text-indigo-600 tabular-nums">{currentPage + 1}</span>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">of</span>
            <span className="text-xs font-bold text-slate-500 tabular-nums">{numPages}</span>
          </div>

          <button 
            onClick={handleNext}
            disabled={currentPage === numPages - 1}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all active:scale-90"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
           <div className="relative group">
              <select 
                value={currentPage}
                onChange={handleJumpToPage}
                className="h-9 pl-8 pr-4 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none appearance-none cursor-pointer hover:border-indigo-300 transition-colors"
              >
                {Array.from({ length: numPages }).map((_, i) => (
                  <option key={i} value={i}>Go to Page {i + 1}</option>
                ))}
              </select>
              <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
           </div>
        </div>
      </div>

      <div 
        ref={containerRef}
        className={cn(
          "relative flex items-center justify-center w-full min-h-[400px] bg-slate-100/50 rounded-[32px] p-6 overflow-hidden border border-black/5",
          isSelectionMode && "cursor-crosshair"
        )}
      >
        {Array.from({ length: numPages }).map((_, index) => {
          // VIRTUAL WINDOWING: Only render the current page and 1 neighbor
          // This keeps only 3 canvases in memory max, preventing OOM.
          const isActive = index === currentPage;
          const isNeighbor = Math.abs(index - currentPage) <= 1;
          const shouldRender = isActive || isNeighbor;

          return (
            <CanvasPage
              key={index}
              index={index}
              isActive={isActive}
              shouldRender={shouldRender}
              registerCanvas={registerCanvas}
              isDragging={isDragging}
              startPos={startPos}
              currentPos={currentPos}
              blurAreas={blurAreas}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              documentType={documentType}
            />
          );
        })}
      </div>
    </div>
  );
};
