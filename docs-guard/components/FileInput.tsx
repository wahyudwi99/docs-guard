import React from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileInputProps {
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

export const FileInput: React.FC<FileInputProps> = ({ onFileChange, className }) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors",
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
      <label htmlFor="file-upload" className="flex flex-col items-center justify-center space-y-2 cursor-pointer">
        <Upload className="w-10 h-10 text-gray-400" />
        <p className="text-gray-600 text-center">
          Drag and drop an image or PDF here, or <span className="text-blue-600 font-medium">browse</span>
        </p>
        <p className="text-sm text-gray-500">PNG, JPG, PDF up to 10MB</p>
      </label>
    </div>
  );
};
