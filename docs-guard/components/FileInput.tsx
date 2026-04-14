import React from "react";
import { Upload, FilePlus, Image as ImageIcon, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileInputProps {
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

export const FileInput: React.FC<FileInputProps> = ({ onFileChange, className }) => {
  return (
    <div
      className={cn(
        "group relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 transition-all hover:bg-indigo-50/30 hover:border-indigo-300",
        className
      )}
    >
      <input
        id="file-upload"
        type="file"
        accept="image/png, image/jpeg, application/pdf"
        onChange={onFileChange}
        className="sr-only"
      />
      <label 
        htmlFor="file-upload" 
        className="flex flex-col items-center justify-center space-y-4 cursor-pointer text-center"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-indigo-500 shadow-sm transition-transform group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white">
          <Upload className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-slate-900">
            Click to upload or drag & drop
          </p>
          <p className="text-sm text-slate-500">
            PDF, PNG, or JPEG (max 10MB)
          </p>
        </div>
        
        <div className="flex items-center gap-3 pt-2">
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase text-slate-500">
            <ImageIcon className="h-3 w-3" /> Image
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase text-slate-500">
            <FileText className="h-3 w-3" /> PDF
          </div>
        </div>
      </label>
    </div>
  );
};
