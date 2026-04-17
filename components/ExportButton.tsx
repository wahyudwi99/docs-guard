import React from "react";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExportButtonProps {
  onExport: () => Promise<void>;
  className?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ onExport, className }) => {
  return (
    <button
      onClick={onExport}
      className={cn(
        "flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        className
      )}
    >
      <Download className="w-5 h-5" />
      Export Image
    </button>
  );
};
