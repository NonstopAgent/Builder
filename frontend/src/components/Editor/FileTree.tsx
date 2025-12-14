import { useState, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronDown,
  File,
  FileCode,
  FileJson,
  FileText,
  FolderOpen,
  FolderClosed,
  FileType,
  Loader2,
} from "lucide-react";
import { FileEntry } from "../../types";
import { listFiles } from "../../api";
import clsx from "clsx";

interface FileTreeProps {
  files: FileEntry[];
  onFileSelect: (file: FileEntry) => void;
  selectedPath?: string;
  currentPath?: string;
}

// File icon based on extension
const getFileIcon = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "tsx":
    case "ts":
    case "jsx":
    case "js":
      return <FileCode size={14} className="text-sky-400" />;
    case "json":
      return <FileJson size={14} className="text-amber-400" />;
    case "md":
    case "txt":
      return <FileText size={14} className="text-slate-400" />;
    case "py":
      return <FileCode size={14} className="text-green-400" />;
    case "css":
    case "scss":
      return <FileType size={14} className="text-purple-400" />;
    case "html":
      return <FileCode size={14} className="text-orange-400" />;
    default:
      return <File size={14} className="text-slate-400" />;
  }
};

// Individual file/folder item
const FileTreeItem = memo(({
  file,
  onFileSelect,
  selectedPath,
  depth = 0,
}: {
  file: FileEntry;
  onFileSelect: (file: FileEntry) => void;
  selectedPath?: string;
  depth?: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isSelected = selectedPath === file.path;
  const isDirectory = file.type === "directory";

  const handleClick = useCallback(async () => {
    if (isDirectory) {
      if (!isExpanded && children.length === 0) {
        setIsLoading(true);
        try {
          const entries = await listFiles(file.path);
          setChildren(entries);
        } catch (err) {
          console.error("Failed to load directory:", err);
        } finally {
          setIsLoading(false);
        }
      }
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect(file);
    }
  }, [isDirectory, isExpanded, children.length, file, onFileSelect]);

  return (
    <div>
      <button
        onClick={handleClick}
        className={clsx(
          "w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-left text-sm transition-colors group",
          isSelected
            ? "bg-sky-500/20 text-sky-300"
            : "text-slate-300 hover:bg-slate-800/70 hover:text-slate-100"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isDirectory ? (
          <>
            {isLoading ? (
              <Loader2 size={12} className="animate-spin text-slate-400" />
            ) : isExpanded ? (
              <ChevronDown size={12} className="text-slate-400" />
            ) : (
              <ChevronRight size={12} className="text-slate-400" />
            )}
            {isExpanded ? (
              <FolderOpen size={14} className="text-amber-400" />
            ) : (
              <FolderClosed size={14} className="text-amber-400" />
            )}
          </>
        ) : (
          <>
            <span className="w-3" /> {/* Spacer for alignment */}
            {getFileIcon(file.name)}
          </>
        )}
        <span className="truncate flex-1">{file.name}</span>
        {!isDirectory && file.size !== undefined && (
          <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
            {formatFileSize(file.size)}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isDirectory && isExpanded && children.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            {children
              .sort((a, b) => {
                // Directories first, then alphabetical
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === "directory" ? -1 : 1;
              })
              .map((child) => (
                <FileTreeItem
                  key={child.path}
                  file={child}
                  onFileSelect={onFileSelect}
                  selectedPath={selectedPath}
                  depth={depth + 1}
                />
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

FileTreeItem.displayName = "FileTreeItem";

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

// Main FileTree component
export const FileTree = memo(({
  files,
  onFileSelect,
  selectedPath,
}: FileTreeProps) => {
  const sortedFiles = [...files].sort((a, b) => {
    // Directories first, then alphabetical
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === "directory" ? -1 : 1;
  });

  if (files.length === 0) {
    return (
      <div className="text-xs text-slate-500 p-2">
        No files in workspace
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {sortedFiles.map((file) => (
        <FileTreeItem
          key={file.path}
          file={file}
          onFileSelect={onFileSelect}
          selectedPath={selectedPath}
        />
      ))}
    </div>
  );
});

FileTree.displayName = "FileTree";

export default FileTree;
