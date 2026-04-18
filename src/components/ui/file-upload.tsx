"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import {
  CheckCircle,
  File as FileIcon,
  Loader,
  Trash2,
  UploadCloud,
} from "lucide-react";

interface FileWithPreview {
  id: string;
  preview: string;
  progress: number;
  name: string;
  size: number;
  type: string;
  lastModified?: number;
  file?: File;
}

const allowedTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const isAllowedFile = (file: File) =>
  allowedTypes.has(file.type) || /\.(pdf|docx)$/i.test(file.name);

export default function FileUpload() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [rejectedCount, setRejectedCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList) => {
    const accepted = Array.from(fileList).filter(isAllowedFile);
    const rejected = fileList.length - accepted.length;

    setRejectedCount(rejected);

    const newFiles = accepted.map((file) => {
      const preview = URL.createObjectURL(file);

      return {
        id: `${preview}-${Date.now()}`,
        preview,
        progress: 0,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        lastModified: file.lastModified,
        file,
      };
    });

    setFiles((prev) => [...prev, ...newFiles]);
    newFiles.forEach((file) => simulateUpload(file.id));
  };

  const simulateUpload = (id: string) => {
    let progress = 0;
    const interval = window.setInterval(() => {
      progress += Math.random() * 15;
      setFiles((prev) =>
        prev.map((file) =>
          file.id === id ? { ...file, progress: Math.min(progress, 100) } : file,
        ),
      );

      if (progress >= 100) {
        window.clearInterval(interval);
        if (navigator.vibrate) navigator.vibrate(100);
      }
    }, 300);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onSelect = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) handleFiles(event.target.files);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const removed = prev.find((file) => file.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);

      return prev.filter((file) => file.id !== id);
    });
  };

  const clearFiles = () => {
    files.forEach((file) => URL.revokeObjectURL(file.preview));
    setFiles([]);
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const index = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, index)).toFixed(2)} ${sizes[index]}`;
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 md:p-6">
      <motion.div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        initial={false}
        animate={{
          borderColor: isDragging ? "#60a5fa" : "rgba(255,255,255,0.12)",
          scale: isDragging ? 1.02 : 1,
        }}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
        className={clsx(
          "relative rounded-lg p-8 md:p-12 text-center cursor-pointer bg-white/8 border border-white/10 shadow-sm hover:shadow-md backdrop-blur group",
          isDragging && "ring-4 ring-blue-400/30 border-blue-500",
        )}
      >
        <div className="flex flex-col items-center gap-5">
          <motion.div
            animate={{ y: isDragging ? [-5, 0, -5] : 0 }}
            transition={{
              duration: 1.5,
              repeat: isDragging ? Infinity : 0,
              ease: "easeInOut",
            }}
            className="relative"
          >
            <motion.div
              animate={{
                opacity: isDragging ? [0.5, 1, 0.5] : 1,
                scale: isDragging ? [0.95, 1.05, 0.95] : 1,
              }}
              transition={{
                duration: 2,
                repeat: isDragging ? Infinity : 0,
                ease: "easeInOut",
              }}
              className="absolute -inset-4 bg-blue-400/10 rounded-full blur-md"
              style={{ display: isDragging ? "block" : "none" }}
            />
            <UploadCloud
              className={clsx(
                "w-16 h-16 md:w-20 md:h-20 drop-shadow-sm",
                isDragging
                  ? "text-blue-400"
                  : "text-zinc-300 group-hover:text-blue-400 transition-colors duration-300",
              )}
            />
          </motion.div>

          <div className="space-y-2">
            <h3 className="text-xl md:text-2xl font-semibold text-zinc-100">
              {isDragging
                ? "Drop files here"
                : files.length
                  ? "Add more files"
                  : "Upload verification files"}
            </h3>
            <p className="text-zinc-300 md:text-lg max-w-md mx-auto">
              {isDragging ? (
                <span className="font-medium text-blue-400">
                  Release to upload
                </span>
              ) : (
                <>
                  Drag & drop PDF or DOCX files here, or{" "}
                  <span className="text-blue-400 font-medium">browse</span>
                </>
              )}
            </p>
            <p className="text-sm text-zinc-400">
              PDF and DOCX files only
            </p>
            {rejectedCount > 0 && (
              <p className="text-sm font-medium text-red-300">
                {rejectedCount} unsupported file{rejectedCount === 1 ? "" : "s"} ignored.
              </p>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={onSelect}
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          />
        </div>
      </motion.div>

      <div className="mt-8">
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-between items-center mb-3 px-2"
            >
              <h3 className="font-semibold text-lg md:text-xl text-zinc-100">
                Uploaded files ({files.length})
              </h3>
              {files.length > 1 && (
                <button
                  onClick={clearFiles}
                  className="text-sm font-medium px-3 py-1 bg-white/10 hover:bg-white/15 rounded-md text-zinc-300 hover:text-red-300 transition-colors duration-200"
                >
                  Clear all
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className={clsx(
            "flex flex-col gap-3 overflow-y-auto pr-2",
            files.length > 3 && "max-h-96",
          )}
        >
          <AnimatePresence>
            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="px-4 py-4 flex items-start gap-4 rounded-lg bg-white/10 border border-white/10 shadow hover:shadow-md transition-all duration-200"
              >
                <div className="relative flex-shrink-0">
                  <FileIcon className="w-16 h-16 md:w-20 md:h-20 text-zinc-300" />
                  {file.progress === 100 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute -right-2 -bottom-2 bg-zinc-950 rounded-full shadow-sm"
                    >
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    </motion.div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileIcon className="w-5 h-5 flex-shrink-0 text-blue-400" />
                      <h4
                        className="font-medium text-base md:text-lg truncate text-zinc-100"
                        title={file.name}
                      >
                        {file.name}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm text-zinc-400">
                      <span className="text-xs md:text-sm">
                        {formatFileSize(file.size)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="font-medium">
                          {Math.round(file.progress)}%
                        </span>
                        {file.progress < 100 ? (
                          <Loader className="w-4 h-4 animate-spin text-blue-400" />
                        ) : (
                          <Trash2
                            className="w-4 h-4 cursor-pointer text-zinc-400 hover:text-red-300 transition-colors duration-200"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeFile(file.id);
                            }}
                            aria-label="Remove file"
                          />
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mt-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${file.progress}%` }}
                      transition={{
                        duration: 0.4,
                        type: "spring",
                        stiffness: 100,
                        ease: "easeOut",
                      }}
                      className={clsx(
                        "h-full rounded-full shadow-inner",
                        file.progress < 100 ? "bg-blue-500" : "bg-emerald-500",
                      )}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
