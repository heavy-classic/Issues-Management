import { useState, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import api from "../api/client";
import { downloadFile } from "../utils/downloadUtils";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface Attachment {
  id: string;
  original_name: string;
  mime_type: string;
  file_size: number;
}

interface Props {
  attachment: Attachment;
  onClose: () => void;
}

type ViewerType = "pdf" | "image" | "text" | "unsupported";

function getViewerType(mimeType: string): ViewerType {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("text/") || mimeType === "application/json")
    return "text";
  return "unsupported";
}

export default function DocumentViewerModal({ attachment, onClose }: Props) {
  const viewerType = getViewerType(attachment.mime_type);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (viewerType === "pdf" || viewerType === "image") {
      api
        .get(`/attachments/${attachment.id}/preview`, { responseType: "blob" })
        .then((res) => {
          const url = URL.createObjectURL(res.data);
          setBlobUrl(url);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [attachment.id, viewerType]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay viewer-overlay" onClick={onClose}>
      <div className="viewer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="viewer-header">
          <span className="viewer-filename">{attachment.original_name}</span>
          <div className="viewer-header-actions">
            <button
              className="btn btn-sm btn-secondary"
              onClick={() =>
                downloadFile(attachment.id, attachment.original_name)
              }
            >
              Download
            </button>
            <button
              className="btn-icon viewer-close-btn"
              onClick={onClose}
              title="Close (Esc)"
            >
              {"\u00D7"}
            </button>
          </div>
        </div>
        <div className="viewer-body">
          {loading ? (
            <p className="loading">Loading preview...</p>
          ) : (
            <>
              {viewerType === "pdf" && blobUrl && (
                <PDFViewer url={blobUrl} />
              )}
              {viewerType === "image" && blobUrl && (
                <ImageViewer url={blobUrl} name={attachment.original_name} />
              )}
              {viewerType === "text" && (
                <TextViewer attachmentId={attachment.id} />
              )}
              {viewerType === "unsupported" && (
                <div className="viewer-unsupported">
                  <div className="viewer-unsupported-icon">
                    {"\u{1F4C4}"}
                  </div>
                  <p>Preview not available for this file type.</p>
                  <button
                    className="btn btn-primary"
                    onClick={() =>
                      downloadFile(attachment.id, attachment.original_name)
                    }
                  >
                    Download File
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PDFViewer({ url }: { url: string }) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  return (
    <div className="pdf-viewer">
      <div className="pdf-toolbar">
        <button
          className="btn btn-sm btn-secondary"
          disabled={currentPage <= 1}
          onClick={() => setCurrentPage((p) => p - 1)}
        >
          Prev
        </button>
        <span className="pdf-page-info">
          Page {currentPage} of {numPages || "..."}
        </span>
        <button
          className="btn btn-sm btn-secondary"
          disabled={currentPage >= numPages}
          onClick={() => setCurrentPage((p) => p + 1)}
        >
          Next
        </button>
        <span className="pdf-zoom-separator">|</span>
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
        >
          -
        </button>
        <span className="pdf-zoom-info">{Math.round(zoom * 100)}%</span>
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => setZoom((z) => Math.min(3.0, z + 0.25))}
        >
          +
        </button>
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => setZoom(1.0)}
        >
          Fit
        </button>
      </div>
      <div className="pdf-document-container">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<p className="loading">Loading PDF...</p>}
          error={<p className="error">Failed to load PDF.</p>}
        >
          <Page
            pageNumber={currentPage}
            scale={zoom}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>
    </div>
  );
}

function ImageViewer({ url, name }: { url: string; name: string }) {
  const [zoom, setZoom] = useState(1.0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1) return;
      setDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    },
    [zoom, position]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [dragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  return (
    <div className="image-viewer">
      <div className="image-toolbar">
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => {
            setZoom((z) => Math.max(0.25, z - 0.25));
            setPosition({ x: 0, y: 0 });
          }}
        >
          -
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => setZoom((z) => Math.min(5, z + 0.25))}
        >
          +
        </button>
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => {
            setZoom(1);
            setPosition({ x: 0, y: 0 });
          }}
        >
          Fit
        </button>
      </div>
      <div
        className="image-container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "default",
        }}
      >
        <img
          src={url}
          alt={name}
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            maxWidth: "100%",
            maxHeight: "100%",
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}

function TextViewer({ attachmentId }: { attachmentId: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/attachments/${attachmentId}/preview`, { responseType: "text" })
      .then((res) => setContent(res.data))
      .catch(() => setError("Failed to load text content"));
  }, [attachmentId]);

  if (error) return <p className="error">{error}</p>;
  if (content === null) return <p className="loading">Loading...</p>;

  const lines = content.split("\n");

  return (
    <div className="text-viewer">
      <pre className="text-viewer-content">
        {lines.map((line, i) => (
          <div key={i} className="text-viewer-line">
            <span className="text-viewer-line-num">{i + 1}</span>
            <span className="text-viewer-line-text">{line}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}
