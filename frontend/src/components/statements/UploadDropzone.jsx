import { Cloud, AlertCircle } from "lucide-react";
import { useState, useRef } from "react";
import { motion } from "framer-motion";

export default function UploadDropzone({ onFileSelect, isUploading }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const validateFile = (file) => {
    // Check file size (20 MB limit)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("File size exceeds 20 MB limit");
      return false;
    }

    // Check file type (CSV or PDF)
    const isValidType =
      file.name.toLowerCase().endsWith(".csv") ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isValidType) {
      setError("Only CSV and PDF files are supported");
      return false;
    }

    setError(null);
    return true;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        onFileSelect?.(file);
      }
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        onFileSelect?.(file);
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Show uploading state (backend processes synchronously, so this is brief)
  if (isUploading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
            <Cloud className="w-8 h-8 text-blue-600" />
          </div>

          <h3 className="text-xl font-bold text-slate-800 mb-2">
            Uploading...
          </h3>

          <p className="text-slate-500">
            Your statement is being processed by the server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.pdf"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Icon */}
        <motion.div
          className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4"
          animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <Cloud className="w-8 h-8 text-blue-600" />
        </motion.div>

        {/* Heading */}
        <h3 className="text-2xl font-bold text-slate-800 mb-2">
          Drag & Drop your Statement
        </h3>

        {/* Subtext */}
        <p className="text-slate-500 mb-6">
          or click to browse
        </p>

        {/* Supported formats */}
        <div className="flex flex-wrap gap-3 justify-center mb-6">
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-sm font-medium">
            PhonePe
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-sm font-medium">
            Google Pay
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-sm font-medium">
            Paytm
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-sm font-medium">
            CSV or PDF
          </span>
        </div>

        {/* File size limit */}
        <p className="text-slate-400 text-sm">
          Maximum file size: <span className="font-semibold">20 MB</span>
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </motion.div>
      )}
    </div>
  );
}
