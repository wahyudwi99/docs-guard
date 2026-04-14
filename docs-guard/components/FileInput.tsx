import React from "react";
import { Upload, FileText, Image as ImageIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileInputProps {
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

export const FileInput: React.FC<FileInputProps> = ({ onFileChange, className }) => {
  return (
    <div
      className={cn(
        "group relative flex flex-col items-center justify-center p-10 border-2 border-dashed border-indigo-200/50 rounded-[32px] bg-indigo-50/20 hover:bg-white hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-500 ease-in-out cursor-pointer overflow-hidden",
        className
      )}
    >
      {/* Dynamic Background Circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-100/30 rounded-full blur-3xl scale-0 group-hover:scale-150 transition-transform duration-700"></div>

      <input
        id="file-upload"
        type="file"
        accept="image/png, image/jpeg, application/pdf"
        onChange={onFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
      
      <div className="relative z-0 flex flex-col items-center justify-center space-y-6 text-center">
        <div className="relative">
            <div className="absolute inset-0 bg-indigo-500 rounded-2xl blur-xl opacity-0 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative flex h-20 w-20 items-center justify-center rounded-[24px] bg-white text-indigo-600 shadow-xl border border-indigo-50 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 ease-spring">
              <Upload className="w-9 h-9" />
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg border-2 border-white scale-0 group-hover:scale-100 transition-transform delay-100">
                <Plus className="h-3 w-3" />
              </div>
            </div>
        </div>
        
        <div className="space-y-2">
          <p className="text-[#1C1C1E] text-lg font-black tracking-tight leading-none">
            Import Document
          </p>
          <p className="text-xs font-bold text-slate-400 max-w-[180px] mx-auto leading-relaxed">
            Drag & Drop or <span className="text-indigo-600">Browse Library</span>
          </p>
        </div>
        
        <div className="flex gap-2 pt-2 scale-90 opacity-60 group-hover:opacity-100 group-hover:scale-100 transition-all duration-500">
          <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-widest shadow-sm">PDF</span>
          <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-widest shadow-sm">IMAGE</span>
        </div>
      </div>
      
      <style jsx>{`
        .ease-spring {
          transition-timing-function: cubic-bezier(0.68, -0.6, 0.32, 1.6);
        }
      `}</style>
    </div>
  );
};
