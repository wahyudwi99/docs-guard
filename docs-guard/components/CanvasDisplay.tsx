import React from "react";

interface CanvasDisplayProps {
  numPages: number;
  registerCanvas: (el: HTMLCanvasElement | null, index: number) => void;
}

export const CanvasDisplay: React.FC<CanvasDisplayProps> = ({ numPages, registerCanvas }) => {
  return (
    <div className="flex flex-col gap-6 w-full max-h-[70vh] overflow-y-auto custom-scrollbar p-4 bg-slate-100/50 rounded-xl">
      {Array.from({ length: numPages }).map((_, index) => (
        <div key={index} className="relative w-full flex justify-center bg-white shadow-lg rounded-lg overflow-hidden border border-slate-200">
          <canvas
            ref={(el) => registerCanvas(el, index)}
            className="max-w-full h-auto"
          />
          <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-md">
            Page {index + 1}
          </div>
        </div>
      ))}
    </div>
  );
};
