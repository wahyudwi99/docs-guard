import React from "react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ColorPicker } from "@/components/ui/color-picker";
import { useWatermark } from "@/hooks/useWatermark";

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
    <div className="w-full max-w-sm p-4 space-y-4 bg-white rounded-lg shadow-md">
      <div>
        <label htmlFor="watermark-text" className="block text-sm font-medium text-gray-700">
          Watermark Text
        </label>
        <Input
          id="watermark-text"
          type="text"
          value={watermarkText}
          onChange={(e) => setWatermarkText(e.target.value)}
          placeholder="Enter watermark text"
          className="mt-1 block w-full"
        />
      </div>

      <div>
        <label htmlFor="watermark-color" className="block text-sm font-medium text-gray-700">
          Watermark Color
        </label>
        <div className="flex items-center mt-1 space-x-2">
          <ColorPicker
            id="watermark-color"
            value={watermarkColor}
            onValueChange={setWatermarkColor}
          />
          <Input
            type="text"
            value={watermarkColor}
            onChange={(e) => setWatermarkColor(e.target.value)}
            className="flex-1"
          />
        </div>
      </div>

      <div>
        <label htmlFor="watermark-opacity" className="block text-sm font-medium text-gray-700">
          Watermark Opacity ({(watermarkOpacity * 100).toFixed(0)}%)
        </label>
        <Slider
          id="watermark-opacity"
          min={0}
          max={1}
          step={0.01}
          value={watermarkOpacity}
          onValueChange={setWatermarkOpacity}
          className="mt-1"
        />
      </div>
    </div>
  );
};
