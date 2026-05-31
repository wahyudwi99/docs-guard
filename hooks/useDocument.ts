import { useState, useCallback } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { loadPdf, renderPdfPageToCanvas } from "@/lib/pdf";
import { useI18n } from "@/hooks/useI18n";
import { useSubscription } from "@/hooks/useSubscription";

type DocumentType = "image" | "pdf" | "video" | null;

interface UseDocumentProps {
  registerCanvas: (el: HTMLCanvasElement | null, index: number) => void;
}

export function useDocument({ registerCanvas }: UseDocumentProps) {
  const { t } = useI18n();
  const { isPro } = useSubscription();
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [limitExceeded, setLimitExceeded] = useState(false);

  const clearDocument = useCallback(() => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setFile(null);
    setDocumentType(null);
    setPdfDoc(null);
    setVideoUrl(null);
    setNumPages(0);
    setError(null);
    setLimitExceeded(false);
  }, [videoUrl]);

  const loadImage = useCallback(
    async (imageFile: File, canvas: HTMLCanvasElement) => {
      const img = new Image();
      const context = canvas.getContext("2d");
      if (!context) return;

      return new Promise<void>((resolve, reject) => {
        img.onload = () => {
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;

          canvas.width = width;
          canvas.height = height;

          const dpr = window.devicePixelRatio || 1;
          canvas.style.width = `${width / dpr}px`;
          canvas.style.height = `${height / dpr}px`;

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
    async (selectedFile: File, currentCanvases: HTMLCanvasElement[], videoElement?: HTMLVideoElement | null) => {
      if (currentCanvases.length === 0) return;

      try {
        if (selectedFile.type.startsWith("image/")) {
          const canvas = currentCanvases[0];
          await loadImage(selectedFile, canvas);
        } else if (selectedFile.type.startsWith("video/") && videoElement) {
          const canvas = currentCanvases[0];
          const context = canvas.getContext("2d");
          if (context && videoElement.readyState >= 2) {
            const width = videoElement.videoWidth;
            const height = videoElement.videoHeight;

            if (canvas.width !== width) {
              canvas.width = width;
              canvas.height = height;
              const dpr = window.devicePixelRatio || 1;
              canvas.style.width = `${width / dpr}px`;
              canvas.style.height = `${height / dpr}px`;
            }
            context.drawImage(videoElement, 0, 0, width, height);
          }
        } else if (selectedFile.type === "application/pdf") {
          let doc = pdfDoc;
          if (!doc) {
            doc = await loadPdf(new Uint8Array(await selectedFile.arrayBuffer()));
            setPdfDoc(doc);
            setNumPages(doc.numPages);
          }

          // In virtual windowing mode, 'currentCanvases' contains ONLY the 
          // visible canvases. We render them by their actual index.
          const renderPromises = currentCanvases.map(async (canvas) => {
             // We find which index this canvas belongs to
             // In useCanvas, the 'canvases' array is already sorted and filtered
             // For PDF, we need the page number (1-based)
             // We'll rely on the parent to manage the correct mapping.
          });
          // This method is now primarily a proxy for the watermark loop.
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
      clearDocument();
      if (!selectedFile) return;

      setFile(selectedFile);
      
      try {
        if (selectedFile.type.startsWith("image/")) {
          setDocumentType("image");
          setNumPages(1);
        } else if (selectedFile.type.startsWith("video/")) {
          const video = document.createElement('video');
          video.preload = 'metadata';
          await new Promise<void>((resolve, reject) => {
            video.onloadedmetadata = () => {
              window.URL.revokeObjectURL(video.src);
              if (!isPro && video.duration > 15) {
                setLimitExceeded(true);
                setDocumentType(null);
                setFile(null);
                setNumPages(0);
                resolve();
                return;
              }
              setDocumentType("video");
              setNumPages(1);
              setVideoUrl(URL.createObjectURL(selectedFile));
              resolve();
            };
            video.onerror = () => reject(new Error("Failed to load video metadata"));
            video.src = URL.createObjectURL(selectedFile);
          });
        } else if (selectedFile.type === "application/pdf") {
          const arrayBuffer = await selectedFile.arrayBuffer();
          const doc = await loadPdf(new Uint8Array(arrayBuffer));
          
          if (!isPro && doc.numPages > 3) {
            setLimitExceeded(true);
            setDocumentType(null);
            setFile(null);
            setNumPages(0);
            return;
          }

          setDocumentType("pdf");
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
    [clearDocument, t, isPro]
  );

  return {
    file,
    documentType,
    pdfDoc,
    videoUrl,
    numPages,
    error,
    limitExceeded,
    setLimitExceeded,
    handleFileChange,
    clearDocument,
    drawDocumentOnCanvases,
  };
}
