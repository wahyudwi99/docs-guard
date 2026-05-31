/**
 * Utility functions for drawing watermarks and blurs consistently 
 * across UI previews and file exports.
 */

interface WatermarkOptions {
  text: string;
  type: "text" | "image";
  layout: "tiled" | "single";
  color: string;
  opacity: number;
  fontFamily: string;
  fontSize: number;
  orientation: "horizontal" | "diagonal" | "vertical";
  image?: HTMLImageElement | null;
  imageScale?: number;
}

interface BlurArea {
  x: number;
  y: number;
  width: number;
  height: number;
  pageIndex: number;
}

export function applyWatermarkToContext(
  context: CanvasRenderingContext2D, 
  width: number, 
  height: number,
  options: WatermarkOptions
) {
  const { 
    text, type, layout, color, opacity, 
    fontFamily, fontSize, orientation, 
    image, imageScale = 0.5 
  } = options;

  context.save();
  context.globalAlpha = opacity;
  
  let angle = 0;
  if (orientation === "diagonal") angle = -Math.PI / 4;
  else if (orientation === "vertical") angle = -Math.PI / 2;

  context.translate(width / 2, height / 2);
  context.rotate(angle);

  if (type === "text") {
    context.fillStyle = color;
    const responsiveFontSize = (width / 800) * fontSize;
    context.font = `${responsiveFontSize}px ${fontFamily}`;
    context.textAlign = "center";
    context.textBaseline = "middle";

    if (layout === "single") {
      context.fillText(text, 0, 0);
    } else {
      const metrics = context.measureText(text);
      const textWidth = metrics.width;
      const textHeight = responsiveFontSize;
      
      const horizontalSpacing = textWidth + (width / 10); 
      const verticalSpacing = textHeight * 4;

      for (let i = -width * 1.5; i < width * 1.5; i += horizontalSpacing) {
        for (let j = -height * 1.5; j < height * 1.5; j += verticalSpacing) {
          context.fillText(text, i, j);
        }
      }
    }
  } else if (type === "image" && image) {
    const baseWidth = (width / 4) * imageScale;
    const aspectRatio = image.height / image.width;
    const imgWidth = baseWidth;
    const imgHeight = baseWidth * aspectRatio;

    if (layout === "single") {
      context.drawImage(image, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
    } else {
      const horizontalSpacing = imgWidth * 2.5;
      const verticalSpacing = imgHeight * 3;

      for (let i = -width * 1.5; i < width * 1.5; i += horizontalSpacing) {
        for (let j = -height * 1.5; j < height * 1.5; j += verticalSpacing) {
          context.drawImage(image, i - imgWidth / 2, j - imgHeight / 2, imgWidth, imgHeight);
        }
      }
    }
  }

  context.restore();
}

export function applyBlurToContext(
  context: CanvasRenderingContext2D, 
  sourceCanvas: HTMLCanvasElement,
  pageIndex: number,
  blurAreas: BlurArea[],
  blurStrength: number
) {
  const pageBlurAreas = blurAreas.filter(a => a.pageIndex === pageIndex);
  if (pageBlurAreas.length === 0) return;

  pageBlurAreas.forEach(area => {
    const ax = Math.floor(area.x);
    const ay = Math.floor(area.y);
    const aw = Math.ceil(area.width);
    const ah = Math.ceil(area.height);

    if (aw <= 0 || ah <= 0) return;

    // Use a small factor for the pixelation effect
    const privacyFactor = Math.max(0.005, 0.1 - (blurStrength * 0.004)); 
    const tempW = Math.max(1, Math.floor(aw * privacyFactor));
    const tempH = Math.max(1, Math.floor(ah * privacyFactor));
    
    const blurCanvas = document.createElement("canvas");
    blurCanvas.width = tempW;
    blurCanvas.height = tempH;
    const blurCtx = blurCanvas.getContext("2d");
    
    if (blurCtx) {
      blurCtx.imageSmoothingEnabled = true;
      blurCtx.drawImage(sourceCanvas, ax, ay, aw, ah, 0, 0, tempW, tempH);
      
      context.save();
      context.beginPath();
      context.rect(ax, ay, aw, ah);
      context.clip();
      
      const iterations = 8; 
      context.globalAlpha = 1.0; 
      context.drawImage(blurCanvas, 0, 0, tempW, tempH, ax, ay, aw, ah);
      
      context.globalAlpha = 0.4;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "low"; 
      
      for (let i = 0; i < iterations; i++) {
        const angle = (i / iterations) * Math.PI * 2;
        const radius = blurStrength * 0.8;
        const offsetX = Math.cos(angle) * radius;
        const offsetY = Math.sin(angle) * radius;
        context.drawImage(blurCanvas, 0, 0, tempW, tempH, ax + offsetX, ay + offsetY, aw, ah);
      }
      
      context.fillStyle = "rgba(255, 255, 255, 0.1)";
      context.fillRect(ax, ay, aw, ah);
      context.restore();
    }
  });
}
