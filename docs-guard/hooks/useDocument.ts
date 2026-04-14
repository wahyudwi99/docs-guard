import { useState, useCallback, useEffect } from "react";
import { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import { loadPdf, renderPdfPageToCanvas } from "@/lib/pdf"; // Assuming @/lib/pdf resolves to docs-guard/lib/pdf.ts

type DocumentType = "image" | "pdf" | null;

interface UseDocumentProps {
  canvas: HTMLCanvasElement | null;
  context: CanvasRenderingContext2D | null;
}

export function useDocument({ canvas, context }: UseDocumentProps) {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);

  const clearDocument = useCallback(() => {
    setFile(null);
    setDocumentType(null);
    setPdfDoc(null);
    if (context && canvas) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [canvas, context]);

  const loadImage = useCallback(
    async (imageFile: File) => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(imageFile);
      });
    },
    []
  );

  const drawImageOnCanvas = useCallback(
    async (imageFile: File) => {
      if (!canvas || !context) return;

      const img = await loadImage(imageFile);

      // Calculate aspect ratio to fit the image within a reasonable canvas size
      const maxWidth = 800; // Max width for display
      const maxHeight = 600; // Max height for display

      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src); // Clean up the object URL
    },
    [canvas, context, loadImage]
  );

  const drawPdfOnCanvas = useCallback(
    async (pdfFile: File) => {
      if (!canvas || !context) return;

      const pdfDocument = await loadPdf(new Uint8Array(await pdfFile.arrayBuffer()));
      setPdfDoc(pdfDocument);

      // For simplicity, render the first page
      await renderPdfPageToCanvas(pdfDocument, 1, canvas);
    },
    [canvas, context]
  );

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (!selectedFile) {
        clearDocument();
        return;
      }

      setFile(selectedFile);
      if (selectedFile.type.startsWith("image/")) {
        setDocumentType("image");
        await drawImageOnCanvas(selectedFile);
      } else if (selectedFile.type === "application/pdf") {
        setDocumentType("pdf");
        await drawPdfOnCanvas(selectedFile);
      } else {
        console.error("Unsupported file type:", selectedFile.type);
        clearDocument();
      }
    },
    [clearDocument, drawImageOnCanvas, drawPdfOnCanvas]
  );

  return {
    file,
    documentType,
    pdfDoc,
    handleFileChange,
    clearDocument,
    drawImageOnCanvas, // Expose for re-drawing if needed (e.g., after watermark changes)
    drawPdfOnCanvas,   // Expose for re-drawing if needed
  };
}
