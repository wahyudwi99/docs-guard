import { useState, useCallback } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { loadPdf, renderPdfPageToCanvas } from "@/lib/pdf";
import { useI18n } from "@/hooks/useI18n";

type DocumentType = "image" | "pdf" | null;

interface UseDocumentProps {
  canvases: HTMLCanvasElement[];
}

export function useDocument({ canvases }: UseDocumentProps) {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const clearDocument = useCallback(() => {
    setFile(null);
    setDocumentType(null);
    setPdfDoc(null);
    setNumPages(0);
    setError(null);
  }, []);

  const loadImage = useCallback(
    async (imageFile: File, canvas: HTMLCanvasElement) => {
      const img = new Image();
      const context = canvas.getContext("2d");
      if (!context) return;

      return new Promise<void>((resolve, reject) => {
        img.onload = () => {
          const maxWidth = 800;
          const maxHeight = 600;
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
          context.clearRect(0, 0, width, height);
          context.drawImage(img, 0, 0, width, height);
          URL.revokeObjectURL(img.src);
          resolve();
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(imageFile);
      });
    },
    []
  );

  const drawDocumentOnCanvases = useCallback(
    async (selectedFile: File, currentCanvases: HTMLCanvasElement[]) => {
      if (currentCanvases.length === 0) return;

      try {
        if (selectedFile.type.startsWith("image/")) {
          await loadImage(selectedFile, currentCanvases[0]);
        } else if (selectedFile.type === "application/pdf") {
          let doc = pdfDoc;
          if (!doc) {
            doc = await loadPdf(new Uint8Array(await selectedFile.arrayBuffer()));
            setPdfDoc(doc);
            setNumPages(doc.numPages);
          }

          // Wait for all pages to render if canvases are available
          const renderPromises = [];
          for (let i = 1; i <= doc.numPages; i++) {
            if (currentCanvases[i - 1]) {
              renderPromises.push(renderPdfPageToCanvas(doc, i, currentCanvases[i - 1]));
            }
          }
          await Promise.all(renderPromises);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "RenderingCancelledException") {
          console.error("Error drawing document:", err);
          throw err;
        }
      }
    },
    [loadImage, pdfDoc]
  );

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (!selectedFile) {
        clearDocument();
        return;
      }

      setError(null);
      setPdfDoc(null);
      setFile(selectedFile);
      
      try {
        if (selectedFile.type.startsWith("image/")) {
          setDocumentType("image");
          setNumPages(1);
        } else if (selectedFile.type === "application/pdf") {
          setDocumentType("pdf");
          const doc = await loadPdf(new Uint8Array(await selectedFile.arrayBuffer()));
          setPdfDoc(doc);
          setNumPages(doc.numPages);
        } else {
          throw new Error(t('errors.unsupported_file', { type: selectedFile.type }));
        }
      } catch (err) {
        console.error("Error loading document:", err);
        setError(err instanceof Error ? err.message : t('errors.failed_to_load'));
        setDocumentType(null);
        setFile(null);
        setPdfDoc(null);
        setNumPages(0);
      }
    },
    [clearDocument, t]
  );

  return {
    file,
    documentType,
    pdfDoc,
    numPages,
    error,
    handleFileChange,
    clearDocument,
    drawDocumentOnCanvases,
  };
}
