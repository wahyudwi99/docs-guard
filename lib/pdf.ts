import { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

// Track current render tasks per canvas to cancel them if a new one starts on the same canvas
const renderTasks = new Map<HTMLCanvasElement, { cancel: () => void }>();

// Dynamically import pdfjs-dist and set worker source only on the client side
async function getPdfjsLib() {
  if (typeof window === "undefined") {
    return null; // Don't load on server
  }
  
  // Use the standard build which is more compatible
  const PDFJS = await import("pdfjs-dist");
  
  // DYNAMICALLY set the worker source based on the actual library version
  // This prevents the "API version does not match worker version" error
  console.log(`PDF.js: Loading API version ${PDFJS.version}`);
  PDFJS.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS.version}/build/pdf.worker.min.mjs`;
  
  return PDFJS;
}

/**
 * Renders a specified PDF page onto a given HTML canvas element.
 * @param pdfDocument The PDFDocumentProxy object representing the loaded PDF.
 * @param pageNumber The 1-based index of the page to render.
 * @param canvas The HTMLCanvasElement to draw the PDF page onto.
 * @returns A Promise that resolves when the page has been rendered.
 */
export async function renderPdfPageToCanvas(
  pdfDocument: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement
): Promise<void> {
  console.log(`PDF: Rendering page ${pageNumber}...`);
  // Cancel any ongoing render task on THIS specific canvas
  const existingTask = renderTasks.get(canvas);
  if (existingTask) {
    existingTask.cancel();
    renderTasks.delete(canvas);
  }

  const page: PDFPageProxy = await pdfDocument.getPage(pageNumber);
  
  // Use scale 1.0 for maximum stability on real mobile devices
  const viewport = page.getViewport({ scale: 1.0 }); 

  // Set canvas dimensions
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  // Explicitly set style to match attributes for iOS WebKit
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  const context = canvas.getContext("2d", { 
    alpha: false,
    willReadFrequently: true 
  });

  if (!context) {
    throw new Error("Could not get 2D rendering context for canvas.");
  }

  // FILL WITH WHITE FIRST
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);

  // DEBUG: Draw a small indicator line to prove canvas is working on device
  context.strokeStyle = "red";
  context.lineWidth = 2;
  context.strokeRect(5, 5, 20, 20); // Small red box top-left

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
    canvas: canvas,
  };

  const renderTask = page.render(renderContext);
  renderTasks.set(canvas, renderTask);

  try {
    await renderTask.promise;
    console.log(`PDF: Page ${pageNumber} render completed`);
    renderTasks.delete(canvas);
    page.cleanup(); 
  } catch (error: unknown) {
    // If it was cancelled, we don't want to throw an error up
    if (error instanceof Error && error.name === "RenderingCancelledException") {
      // console.log("PDF rendering cancelled for page", pageNumber);
    } else {
      renderTasks.delete(canvas);
      throw error;
    }
  }
}

/**
 * Loads a PDF file from a URL or Blob and returns a PDFDocumentProxy object.
 * @param src The URL or Blob of the PDF file.
 * @returns A Promise that resolves with the PDFDocumentProxy object.
 */
export async function loadPdf(src: Uint8Array): Promise<PDFDocumentProxy> {
  const PDFJS = await getPdfjsLib();
  if (!PDFJS) {
    throw new Error("pdfjs-dist not available on the server side.");
  }
  // For Uint8Array, it's safer to use the object form
  const loadingTask = PDFJS.getDocument({ data: src });
  const pdf = await loadingTask.promise;
  return pdf;
}
