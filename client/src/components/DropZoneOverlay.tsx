import { useState, useEffect, useCallback } from "react";

interface Props {
  onDrop: (files: File[]) => void;
  children: React.ReactNode;
}

export default function DropZoneOverlay({ onDrop, children }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragCounter((c) => c + 1);
    if (e.dataTransfer?.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragCounter((c) => {
      const next = c - 1;
      if (next <= 0) setIsDragging(false);
      return Math.max(0, next);
    });
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      setDragCounter(0);
      if (e.dataTransfer?.files) {
        onDrop(Array.from(e.dataTransfer.files));
      }
    },
    [onDrop]
  );

  useEffect(() => {
    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop);
    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("drop", handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return (
    <>
      {children}
      {isDragging && (
        <div className="page-drop-overlay">
          <div className="page-drop-overlay-content">
            <span className="page-drop-icon">{"\u{1F4CE}"}</span>
            <p>Drop files to attach</p>
          </div>
        </div>
      )}
    </>
  );
}
