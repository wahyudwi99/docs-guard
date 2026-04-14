import React from "react";

interface CanvasDisplayProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export const CanvasDisplay: React.FC<CanvasDisplayProps> = ({ canvasRef }) => {
  return (
    <div className="relative w-full max-w-2xl bg-gray-100 rounded-lg shadow-md overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-auto max-w-full" // Added max-w-full for responsiveness
      />
    </div>
  );
};
;
