import { useState, useCallback } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { loadPdf, renderPdfPageToCanvas } from "@/lib/pdf";
import { useI18n } from "@/hooks/useI18n";
import { useSubscription } from "@/hooks/useSubscription";

type DocumentType = "image" | "pdf" | "video" | null;

interface UseDocumentProps {
  canvases: HTMLCanvasElement[];
}

export function useDocument({ canvases }: UseDocumentProps) {
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
          // Use original image dimensions (physical pixels) for 1:1 quality
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;

          canvas.width = width;
          canvas.height = height;

          // Set CSS size to look correct on high-DPI screens but keep internal buffer sharp
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
          // Only load and draw if dimensions are not set (first time)
          if (canvas.width === 0 || canvas.height === 0) {
            await loadImage(selectedFile, canvas);
          }
        } else if (selectedFile.type.startsWith("video/") && videoElement) {
          const canvas = currentCanvases[0];
          const context = canvas.getContext("2d");
          if (context && videoElement.readyState >= 2) {
            // Use native video resolution for 1:1 quality
            const width = videoElement.videoWidth;
            const height = videoElement.videoHeight;

            if (canvas.width !== width) {
              canvas.width = width;
              canvas.height = height;

              // Set CSS size to look correct on high-DPI screens but keep internal buffer sharp
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

          // Small delay to allow iOS to finalize canvas sizing in DOM
          await new Promise(resolve => requestAnimationFrame(resolve));

          // Wait for all pages to render if canvases are available
          const renderPromises = [];
          for (let i = 1; i <= doc.numPages; i++) {
            const canvas = currentCanvases[i - 1];
            if (canvas) {
              renderPromises.push(renderPdfPageToCanvas(doc, i, canvas));
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
      setLimitExceeded(false);
      setPdfDoc(null);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
      setFile(selectedFile);
      
      try {
        if (selectedFile.type.startsWith("image/")) {
          setDocumentType("image");
          setNumPages(1);
        } else if (selectedFile.type.startsWith("video/")) {
          // Detect video duration for PRO limit
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
