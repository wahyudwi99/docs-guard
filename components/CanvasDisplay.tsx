import React, { useState, useRef, useEffect } from "react";
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
}

export const CanvasDisplay: React.FC<CanvasDisplayProps> = ({ 
  numPages, 
  registerCanvas,
  isSelectionMode = false,
  onAreaSelected,
  blurAreas = []
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

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isSelectionMode) return;

    const canvases = containerRef.current?.querySelectorAll('canvas');
    if (!canvases || !canvases[currentPage]) return;
    const canvas = canvases[currentPage];
    const rect = canvas.getBoundingClientRect();

    setIsDragging(true);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));

    setStartPos({ x, y });
    setCurrentPos({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const canvases = containerRef.current?.querySelectorAll('canvas');
    if (!canvases || !canvases[currentPage]) return;
    const canvas = canvases[currentPage];
    const rect = canvas.getBoundingClientRect();

    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));

    setCurrentPos({ x, y });
  };

  const handleMouseUp = () => {
    if (!isDragging || !onAreaSelected) {
      setIsDragging(false);
      return;
    }

    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    if (width > 5 && height > 5) {
      const x = Math.min(startPos.x, currentPos.x);
      const y = Math.min(startPos.y, currentPos.y);

      const canvases = containerRef.current?.querySelectorAll('canvas');
      if (canvases && canvases[currentPage]) {
        const canvas = canvases[currentPage];
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        onAreaSelected({
          x: x * scaleX,
          y: y * scaleY,
          width: width * scaleX,
          height: height * scaleY,
          pageIndex: currentPage
        });
      }
    }

    setIsDragging(false);
  };

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
        onMouseMove={handleMouseMove}
        onTouchMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
      >
        {Array.from({ length: numPages }).map((_, index) => (
          <div 
            key={index} 
            className={cn(
              "relative w-full max-w-full flex justify-center bg-white shadow-2xl rounded-2xl overflow-hidden border border-slate-200 transition-all duration-500 ease-in-out absolute",
              currentPage === index 
                ? "opacity-100 scale-100 z-10 translate-x-0" 
                : index < currentPage 
                  ? "opacity-0 scale-90 -z-10 -translate-x-full" 
                  : "opacity-0 scale-90 -z-10 translate-x-full"
            )}
            onMouseDown={(e) => handleMouseDown(e)}
            onTouchStart={(e) => handleMouseDown(e)}
          >
            <canvas
              ref={(el) => registerCanvas(el, index)}
              className="max-w-full h-auto"
            />

            {/* Selection Overlay */}
            {currentPage === index && isDragging && (
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
          </div>
        ))}
      </div>
    </div>
  );
};

