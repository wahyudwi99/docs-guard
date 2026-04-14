import React from "react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ColorPicker } from "@/components/ui/color-picker";
import { Type, Palette, Eye, AlignLeft } from "lucide-react";

interface WatermarkControlsProps {
  watermarkText: string;
  setWatermarkText: (text: string) => void;
  watermarkColor: string;
  setWatermarkColor: (color: string) => void;
  watermarkOpacity: number;
  setWatermarkOpacity: (opacity: number) => void;
}

export const WatermarkControls: React.FC<WatermarkControlsProps> = ({
  watermarkText,
  setWatermarkText,
  watermarkColor,
  setWatermarkColor,
  watermarkOpacity,
  setWatermarkOpacity,
}) => {
  return (
    <div className="w-full space-y-8 p-1">
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

      {/* Color Picker Group */}
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
