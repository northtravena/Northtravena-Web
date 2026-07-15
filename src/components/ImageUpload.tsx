// src/components/ImageUpload.tsx — Reusable image upload with preview + compression

import { useRef } from "react";
import { X, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  label: string;
  value: string;           // compressed base64 data URL or ""
  onChange: (v: string) => void;
  hint?: string;
  required?: boolean;
}

const MAX_FILE_MB  = 10;                        // raw file size gate
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const TARGET_WIDTH  = 800;                      // resize to max 800px wide
const JPEG_QUALITY  = 0.75;                     // 75% JPEG quality → ~100-200KB

/** Resize + compress an image file to a small JPEG data URL via canvas. */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions keeping aspect ratio
      let { width, height } = img;
      if (width > TARGET_WIDTH) {
        height = Math.round((height * TARGET_WIDTH) / width);
        width  = TARGET_WIDTH;
      }

      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    img.src = url;
  });
}

export function ImageUpload({ label, value, onChange, hint, required }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error(`Image must be smaller than ${MAX_FILE_MB}MB.`);
      return;
    }
    try {
      const compressed = await compressImage(file);
      onChange(compressed);
    } catch {
      toast.error("Failed to process image. Please try another file.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-600">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="text-gray-400 font-normal ml-1">({hint})</span>}
      </label>

      {value ? (
        /* Preview */
        <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50" style={{ height: 110 }}>
          <img src={value} alt={label} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow transition-colors"
            title="Remove image"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs text-center py-1 opacity-0 group-hover:opacity-100 transition-opacity">
            Click × to remove
          </div>
        </div>
      ) : (
        /* Drop zone */
        <div
          className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-emerald-50 hover:border-emerald-300 transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-emerald-600"
          style={{ height: 110 }}
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <ImageIcon className="w-4 h-4" />
          </div>
          <p className="text-xs font-medium">Click or drag to upload</p>
          <p className="text-xs text-gray-300">JPG, PNG, WEBP · auto-compressed</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";   // reset so same file can be re-selected
        }}
      />
    </div>
  );
}
