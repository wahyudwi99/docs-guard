import React from "react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ColorPicker } from "@/components/ui/color-picker";
import { Type, Palette, Opacity, Layers } from "lucide-react";

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
    <div className="w-full space-y-6">
      <div className="space-y-3">
        <label htmlFor="watermark-text" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Type className="h-4 w-4 text-slate-400" />
          Watermark Text
        </label>
        <Input
          id="watermark-text"
          type="text"
          value={watermarkText}
          onChange={(e) => setWatermarkText(e.target.value)}
          placeholder="e.g. INTERNAL USE ONLY"
          className="h-10 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 transition-all"
        />
      </div>

      <div className="space-y-3">
        <label htmlFor="watermark-color" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Palette className="h-4 w-4 text-slate-400" />
          Color & Style
        </label>
        <div className="flex items-center gap-3">
          <div className="shrink-0 h-10 w-10 overflow-hidden rounded-lg border border-slate-200 shadow-sm transition-transform hover:scale-105 active:scale-95">
            <ColorPicker
              id="watermark-color"
              value={watermarkColor}
              onValueChange={setWatermarkColor}
            />
          </div>
          <div className="relative flex-1">
            <Input
              type="text"
              value={watermarkColor}
              onChange={(e) => setWatermarkColor(e.target.value)}
              className="h-10 pl-8 font-mono text-xs border-slate-200"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">#</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label htmlFor="watermark-opacity" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Layers className="h-4 w-4 text-slate-400" />
            Transparency
          </label>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            {(watermarkOpacity * 100).toFixed(0)}%
          </span>
        </div>
        <div className="pt-1">
          <Slider
            id="watermark-opacity"
            min={0}
            max={1}
            step={0.01}
            value={watermarkOpacity}
            onValueChange={setWatermarkOpacity}
            className="cursor-pointer"
          />
          <div className="mt-2 flex justify-between text-[10px] text-slate-400 uppercase tracking-tighter">
            <span>Clear</span>
            <span>Opaque</span>
          </div>
        </div>
      </div>
    </div>
  );
};
