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
        "group relative flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 overflow-hidden",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      <Download className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
      <span className="relative">Export Document</span>
    </button>
  );
};
