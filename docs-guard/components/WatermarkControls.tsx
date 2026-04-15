import React from "react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ColorPicker } from "@/components/ui/color-picker";
import { Type, Palette, Eye, AlignLeft, TextCursor, Hash, RotateCw, Image as ImageIcon, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface WatermarkControlsProps {
  watermarkMode: "text" | "image";
  setWatermarkMode: (mode: "text" | "image") => void;
  watermarkText: string;
  setWatermarkText: (text: string) => void;
  watermarkColor: string;
  setWatermarkColor: (color: string) => void;
  watermarkOpacity: number;
  setWatermarkOpacity: (opacity: number) => void;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  orientation: "horizontal" | "diagonal" | "vertical";
  setOrientation: (orientation: "horizontal" | "diagonal" | "vertical") => void;
  setWatermarkImage: (img: HTMLImageElement | null) => void;
  imageScale: number;
  setImageScale: (scale: number) => void;
}

const FONTS = [
  "Arial", "Helvetica", "Times New Roman", "Courier New", "Georgia", 
  "Palatino", "Garamond", "Bookman", "Comic Sans MS", "Trebuchet MS", 
  "Arial Black", "Impact"
];

export const WatermarkControls: React.FC<WatermarkControlsProps> = ({
  watermarkMode,
  setWatermarkMode,
  watermarkText,
  setWatermarkText,
  watermarkColor,
  setWatermarkColor,
  watermarkOpacity,
  setWatermarkOpacity,
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  orientation,
  setOrientation,
  setWatermarkImage,
  imageScale,
  setImageScale,
}) => {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const img = new Image();
      img.onload = () => setWatermarkImage(img);
      img.src = URL.createObjectURL(file);
    }
  };

  return (
    <div className="w-full space-y-6 p-1">
      {/* Mode Switcher */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
          <ImageIcon className="h-3.5 w-3.5" />
          Watermark Type
        </label>
        <div className="flex p-1 bg-black/5 rounded-[16px] gap-1">
          <button
            onClick={() => setWatermarkMode("text")}
            className={cn(
              "flex-1 py-2 rounded-[12px] text-[10px] font-bold uppercase transition-all duration-300 flex items-center justify-center gap-2",
              watermarkMode === "text" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Type className="h-3 w-3" />
            Text
          </button>
          <button
            onClick={() => setWatermarkMode("image")}
            className={cn(
              "flex-1 py-2 rounded-[12px] text-[10px] font-bold uppercase transition-all duration-300 flex items-center justify-center gap-2",
              watermarkMode === "image" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <ImageIcon className="h-3 w-3" />
            Image
          </button>
        </div>
      </div>

      {watermarkMode === "text" ? (
        <>
          {/* Text Input Group */}
          <div className="space-y-3">
            <label htmlFor="watermark-text" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
              <Type className="h-3 w-3" />
              Watermark Content
            </label>
            <div className="relative group">
              <Input
                id="watermark-text"
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="Type protected text..."
                className="h-12 bg-black/5 border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 rounded-2xl transition-all duration-300 font-medium"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                <AlignLeft className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                <TextCursor className="h-3 w-3" />
                Typeface
              </label>
              <select 
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full h-12 px-4 bg-black/5 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-xs font-bold text-slate-600 appearance-none cursor-pointer"
              >
                {FONTS.map(font => (
                  <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                <Hash className="h-3 w-3" />
                Scale
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-black/5 p-4 rounded-2xl">
                  <Slider
                    min={10}
                    max={200}
                    step={1}
                    value={fontSize}
                    onValueChange={setFontSize}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label htmlFor="watermark-color" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
              <Palette className="h-3 w-3" />
              Color Profile
            </label>
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-black/5 rounded-2xl border border-transparent hover:border-indigo-200 transition-all cursor-pointer">
                <ColorPicker
                  id="watermark-color"
                  value={watermarkColor}
                  onValueChange={setWatermarkColor}
                />
              </div>
              <div className="flex-1 relative">
                <Input
                  type="text"
                  value={watermarkColor}
                  onChange={(e) => setWatermarkColor(e.target.value)}
                  className="h-12 bg-black/5 border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 rounded-2xl transition-all font-mono text-sm"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300 uppercase">HEX</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Image Upload Group */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
              <Upload className="h-3.5 w-3.5" />
              Upload Watermark Image
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="h-24 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center bg-black/5 group-hover:bg-black/10 transition-all gap-2">
                <ImageIcon className="h-6 w-6 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select PNG/JPG</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
              <Hash className="h-3 w-3" />
              Image Scale
            </label>
            <div className="bg-black/5 p-5 rounded-[24px]">
              <Slider
                min={0.1}
                max={2}
                step={0.05}
                value={imageScale}
                onValueChange={setImageScale}
              />
            </div>
          </div>
        </>
      )}

      {/* Common Orientation Switcher */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
          <RotateCw className="h-3 w-3" />
          Orientation
        </label>
        <div className="flex p-1 bg-black/5 rounded-[16px] gap-1">
          {(["horizontal", "diagonal", "vertical"] as const).map((o) => (
            <button
              key={o}
              onClick={() => setOrientation(o)}
              className={cn(
                "flex-1 py-2 rounded-[12px] text-[10px] font-bold capitalize transition-all duration-300",
                orientation === o 
                  ? "bg-white text-indigo-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {o}
            </button>
          ))}
        </div>
      </div>

      {/* Opacity Slider Group */}
      <div className="space-y-4 bg-black/5 p-5 rounded-[24px] border border-black/[0.02]">
        <div className="flex items-center justify-between">
          <label htmlFor="watermark-opacity" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
            <Eye className="h-3 w-3" />
            Visibility
          </label>
          <div className="px-3 py-1 bg-white rounded-full shadow-sm border border-black/5">
            <span className="text-[10px] font-black text-indigo-600 tabular-nums">
              {(watermarkOpacity * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="px-1">
          <Slider
            id="watermark-opacity"
            min={0}
            max={1}
            step={0.01}
            value={watermarkOpacity}
            onValueChange={setWatermarkOpacity}
            className="cursor-pointer"
          />
        </div>
        <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
          <span className="opacity-50">Subtle</span>
          <div className="h-px flex-1 mx-4 bg-slate-200/50"></div>
          <span className="opacity-100">Visible</span>
        </div>
      </div>
    </div>
  );
};
