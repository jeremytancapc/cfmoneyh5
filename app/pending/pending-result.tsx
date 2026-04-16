"use client";

import { useCallback, useRef, useState } from "react";
import {
  FileArrowUp,
  File,
  X,
  CheckCircle,
  CloudArrowUp,
  Receipt,
  Car,
  CurrencyDollar,
} from "@phosphor-icons/react";
import { ContainerTextFlip } from "@/components/ui/modern-animated-multi-words";

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DOCUMENT_TYPES = [
  {
    icon: Receipt,
    label: "Bank statement",
    desc: "Latest 3 months",
  },
  {
    icon: Car,
    label: "PHV driver income",
    desc: "Monthly income reports",
  },
  {
    icon: CurrencyDollar,
    label: "Payslip / CPF statement",
    desc: "Latest 1–3 months",
  },
];

export function PendingResult() {
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
        file,
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
    <div className="flex flex-col gap-8">
      {/* Hero: "Application Pending" pill */}
      <div>
        <ContainerTextFlip
          words={["Application Pending"]}
          variant="pending"
          className="font-display"
        />
      </div>

      {/* Submit documents card */}
      <div
        className="flex flex-col gap-4 rounded-[var(--radius-md)] px-5 py-5"
        style={{ background: "oklch(0.72 0.18 85 / 0.06)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
          Submit more documents
        </p>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          Submit your latest 1 to 3 months income documents for us to review
          your application. Accepted documents include:
        </p>

        <ul className="flex flex-col gap-3">
          {DOCUMENT_TYPES.map(({ icon: Icon, label, desc }) => (
            <li key={label} className="flex items-start gap-3">
              <div
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                style={{ background: "oklch(0.72 0.18 85 / 0.12)" }}
              >
                <Icon
                  size={14}
                  weight="duotone"
                  style={{ color: "oklch(0.45 0.16 85)" }}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {label}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {desc}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Upload drop zone */}
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
        className="group relative flex flex-col items-center gap-3 rounded-[var(--radius-md)] border-2 border-dashed px-6 py-8 transition-all duration-200"
        style={{
          borderColor: isDragOver
            ? "oklch(0.55 0.18 85)"
            : "var(--border-subtle)",
          background: isDragOver
            ? "oklch(0.72 0.18 85 / 0.06)"
            : "transparent",
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
          className="flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105"
          style={{ background: "oklch(0.72 0.18 85 / 0.12)" }}
        >
          <CloudArrowUp
            size={24}
            weight="duotone"
            style={{ color: "oklch(0.45 0.16 85)" }}
          />
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            <span className="hidden sm:inline">
              Drag &amp; drop files here or{" "}
            </span>
            <span
              className="text-sm font-semibold underline underline-offset-2"
              style={{ color: "oklch(0.45 0.16 85)" }}
            >
              browse files
            </span>
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            PDF, JPG, PNG or WebP — max 10 MB per file
          </p>
        </div>
      </div>

      {/* Uploaded files list */}
      {files.length > 0 && (
        <div className="flex flex-col gap-2 -mt-4">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 rounded-[var(--radius-sm)] px-4 py-3 transition-colors"
              style={{
                background: "var(--surface-secondary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <File
                size={18}
                weight="duotone"
                className="shrink-0 text-[var(--text-tertiary)]"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {f.name}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {f.size}
                </span>
              </div>
              <CheckCircle
                size={16}
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
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[var(--surface-secondary)]"
                aria-label={`Remove ${f.name}`}
              >
                <X size={12} weight="bold" className="text-[var(--text-tertiary)]" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Submit CTA */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled={files.length === 0}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
          style={{ background: "#B8860B" }}
        >
          <FileArrowUp size={16} weight="bold" />
          Submit Documents
        </button>
        <p className="text-center text-[10px] sm:text-xs leading-relaxed text-[var(--text-tertiary)]">
          Your documents will be reviewed within 1–2 business days. We will
          notify you via SMS once the review is complete.
        </p>
      </div>
    </div>
  );
}
