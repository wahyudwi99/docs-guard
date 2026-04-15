import { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist/types/src/display/api";

// Dynamically import pdfjs-dist and set worker source only on the client side
async function getPdfjsLib() {
  if (typeof window === "undefined") {
    return null; // Don't load on server
  }
  
  // Try importing the minified mjs build
  const PDFJS = await import("pdfjs-dist/build/pdf.min.mjs");
  
  // Set the worker source
  const version = "5.6.205";
  PDFJS.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  
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
  const page: PDFPageProxy = await pdfDocument.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 }); // Initial scale to get original dimensions

  // Set canvas dimensions to match the PDF page dimensions
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not get 2D rendering context for canvas.");
  }

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
    canvas: canvas, // Add the canvas element here
  };

  await page.render(renderContext).promise;
  page.cleanup(); // Clean up page resources.
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
