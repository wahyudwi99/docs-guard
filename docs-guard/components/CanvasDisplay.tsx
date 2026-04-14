import React from "react";

interface CanvasDisplayProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export const CanvasDisplay: React.FC<CanvasDisplayProps> = ({ canvasRef }) => {
  return (
    <div className="relative w-full overflow-hidden bg-white">
      <canvas
        ref={canvasRef}
        className="w-full h-auto max-w-full block"
      />
    </div>
  );
};
