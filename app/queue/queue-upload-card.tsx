"use client";

import { useCallback, useRef, useState } from "react";
import { FileArrowUp, File, X, CheckCircle } from "@phosphor-icons/react";

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface UploadedFile {
  id: string;
  name: string;
  size: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function QueueUploadCard() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const newFiles: UploadedFile[] = [];
    for (const file of Array.from(incoming)) {
      if (!ACCEPTED_TYPES.includes(file.type)) continue;
      if (file.size > MAX_FILE_SIZE) continue;
      newFiles.push({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        size: formatFileSize(file.size),
      });
    }
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) addFiles(e.target.files);
      e.target.value = "";
    },
    [addFiles]
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Eyebrow + heading */}
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
          While you wait
        </p>
        <h3 className="mt-1 font-display text-[17px] font-bold tracking-tight text-[var(--text-primary)]">
          Increase Your Loan Limit
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
          Submit income documents so we can assess and offer you a higher loan amount.
        </p>
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className="group flex flex-col items-center gap-3 rounded-[var(--radius-md)] border px-6 py-6 transition-all duration-200"
        style={{
          borderColor: isDragOver ? "#0033AA" : "var(--border-medium)",
          background: isDragOver ? "oklch(0.32 0.14 260 / 0.03)" : "transparent",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleFileChange}
          className="sr-only"
          aria-label="Upload income documents"
        />

        <div
          className="flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105"
          style={{ background: "oklch(0.32 0.14 260 / 0.07)" }}
        >
          <FileArrowUp size={18} weight="duotone" className="text-brand-blue" />
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Click to upload files
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            PDF, JPG, PNG &mdash; max 10 MB
          </p>
        </div>
      </div>

      {/* Uploaded file list */}
      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-4 py-3"
              style={{ background: "var(--surface-secondary)" }}
            >
              <File size={16} weight="duotone" className="shrink-0 text-[var(--text-tertiary)]" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {f.name}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">{f.size}</span>
              </div>
              <CheckCircle
                size={15}
                weight="fill"
                style={{ color: "oklch(0.55 0.18 155)" }}
                className="shrink-0"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(f.id);
                }}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[var(--border-subtle)]"
                aria-label={`Remove ${f.name}`}
              >
                <X size={11} weight="bold" className="text-[var(--text-tertiary)]" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[#111111] px-5 text-[13px] font-semibold tracking-wide text-white transition-all duration-150 hover:bg-black active:scale-[0.98]"
      >
        <FileArrowUp size={15} weight="bold" />
        Upload documents
      </button>
    </div>
  );
}
