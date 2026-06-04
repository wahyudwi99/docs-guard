import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export async function getFFmpeg() {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();
  
  // Load FFmpeg from CDN
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  return ffmpeg;
}

/**
 * Processes a video by adding a text watermark using FFmpeg.wasm.
 * This ensures 100% original quality and fluidity.
 */
export async function processVideoWithWatermark(
  videoFile: File,
  text: string,
  options: {
    color?: string;
    opacity?: number;
    fontSize?: number;
    layout?: 'single' | 'tiled';
  }
): Promise<Blob> {
  const ffmpeg = await getFFmpeg();
  
  // Add progress logging
  ffmpeg.on('log', ({ message }) => {
    console.log(`[FFMPEG LOG] ${message}`);
  });

  ffmpeg.on('progress', ({ progress, time }) => {
    console.log(`[FFMPEG PROGRESS] ${Math.round(progress * 100)}% - Time: ${time}us`);
  });

  const inputName = 'input' + videoFile.name.substring(videoFile.name.lastIndexOf('.'));
  const outputName = 'output.mp4';

  // Write the file to FFmpeg's virtual filesystem
  await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

  // --- FONT HANDLING ---
  // FFmpeg.wasm needs an explicit font file for drawtext to work
  // Using unpkg to ensure reliable binary delivery with correct CORS headers
  const fontUrl = 'https://unpkg.com/@fontsource/roboto@5.0.8/files/roboto-latin-700-normal.woff2';
  let fontName = 'font.woff2';
  
  try {
    console.log("[FFMPEG] Downloading font...");
    await ffmpeg.writeFile(fontName, await fetchFile(fontUrl));
  } catch (fontErr) {
    console.warn("[FFMPEG] Failed to download font, using fallback...");
    // If woff2 fails, try ttf from another reliable source
    fontName = 'font.ttf';
    const fallbackFontUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Bold.ttf';
    await ffmpeg.writeFile(fontName, await fetchFile(fallbackFontUrl));
  }

  const { color = 'white', opacity = 0.5, fontSize = 24, layout = 'tiled' } = options;
  
  // Convert hex color to FFmpeg format (e.g., 0xFFFFFF) and alpha
  const cleanColor = color.replace('#', '0x');
  
  let filter = '';
  if (layout === 'single') {
    // Center single watermark
    filter = `drawtext=fontfile=${fontName}:text='${text}':fontcolor=${cleanColor}@${opacity}:fontsize=${fontSize}:x=(w-text_w)/2:y=(h-text_h)/2:fix_bounds=true`;
  } else {
    // Minimal tiled pattern
    filter = `drawtext=fontfile=${fontName}:text='${text}':fontcolor=${cleanColor}@${opacity}:fontsize=${fontSize}:x=w*0.1:y=h*0.1,` +
             `drawtext=fontfile=${fontName}:text='${text}':fontcolor=${cleanColor}@${opacity}:fontsize=${fontSize}:x=w*0.5:y=h*0.5,` +
             `drawtext=fontfile=${fontName}:text='${text}':fontcolor=${cleanColor}@${opacity}:fontsize=${fontSize}:x=w*0.8:y=h*0.8`;
  }

  // Execute FFmpeg command
  // -map 0:v:0 -map 0:a? ensures audio is copied only if it exists
  await ffmpeg.exec([
    '-i', inputName,
    '-vf', filter,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-pix_fmt', 'yuv420p',
    '-map', '0:v:0',
    '-map', '0:a?', 
    '-c:a', 'copy',
    '-movflags', '+faststart',
    outputName
  ]);

  // Read the result
  const data = await ffmpeg.readFile(outputName);
  const uint8Data = data as Uint8Array;
  
  console.log(`[FFMPEG] Final output size: ${uint8Data.length} bytes`);
  
  if (uint8Data.length === 0) {
    throw new Error("FFmpeg output is 0Kb. Memory limit likely exceeded.");
  }

  // @ts-ignore - Handle SharedArrayBuffer
  return new Blob([uint8Data], { type: 'video/mp4' });
}
