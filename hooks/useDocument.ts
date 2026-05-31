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

          // 1. Set dimensions FIRST
          canvas.width = width;
          canvas.height = height;

          // 2. Set CSS size for iOS WebKit stability
          const dpr = window.devicePixelRatio || 1;
          canvas.style.width = `${width / dpr}px`;
          canvas.style.height = `${height / dpr}px`;

          // 3. Draw content
          context.clearRect(0, 0, width, height);
          context.drawImage(img, 0, 0, width, height);
          URL.revokeObjectURL(img.src);
          resolve();
        };
        img.onerror = (e) => {
          console.error("Image loading error", e);
          reject(new Error("Failed to load image"));
        };
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
          // For images, we always target the first canvas provided
          await loadImage(selectedFile, currentCanvases[0]);
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
            const buffer = await selectedFile.arrayBuffer();
            doc = await loadPdf(new Uint8Array(buffer));
            setPdfDoc(doc);
            setNumPages(doc.numPages);
          }

          // Process each target canvas based on its data-page-index
          const renderPromises = currentCanvases.map(async (canvas) => {
            const idxAttr = canvas.getAttribute('data-page-index');
            if (idxAttr === null) return;
            const pageIndex = parseInt(idxAttr);
            
            // PDF.js uses 1-based indexing for pages
            await renderPdfPageToCanvas(doc!, pageIndex + 1, canvas);
          });
          
          await Promise.all(renderPromises);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "RenderingCancelledException") {
          console.error("Error drawing document:", err);
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
