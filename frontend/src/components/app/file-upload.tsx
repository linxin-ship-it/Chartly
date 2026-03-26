"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, X } from "lucide-react";

interface FileUploadProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

const ACCEPT = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
  "text/csv": [".csv"],
};

export function FileUpload({ file, onFileChange, disabled }: FileUploadProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) onFileChange(accepted[0]);
    },
    [onFileChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxFiles: 1,
    disabled,
  });

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-[#333333] px-4 py-3">
        <FileSpreadsheet className="h-5 w-5 shrink-0 text-chartly" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{file.name}</p>
          <p className="text-xs text-text-muted">
            {(file.size / 1024).toFixed(1)} KB
          </p>
        </div>
        {!disabled && (
          <button
            onClick={() => onFileChange(null)}
            className="rounded-md p-1 text-text-muted transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 transition-colors ${
        isDragActive
          ? "border-chartly bg-chartly/10"
          : "border-white/15 hover:border-chartly/50 hover:bg-white/5"
      } ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      <input {...getInputProps()} />
      <Upload
        className={`mb-3 h-8 w-8 ${
          isDragActive ? "text-chartly" : "text-text-muted"
        }`}
      />
      <p className="text-center text-sm text-text-muted">
        {isDragActive ? (
          <span className="text-chartly">松开以上传文件</span>
        ) : (
          <>
            拖拽文件至此，或{" "}
            <span className="text-chartly">点击上传</span>
          </>
        )}
      </p>
      <p className="mt-1 text-xs text-text-muted/60">
        支持 .xlsx, .xls, .csv 格式
      </p>
    </div>
  );
}
