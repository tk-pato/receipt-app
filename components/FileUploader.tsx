import React, { useState, useRef } from 'react';
import { Upload, FileVideo, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFilesSelected, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = (files: File[]): File[] => {
    const validFiles: File[] = [];
    let hasInvalid = false;
    for (const file of files) {
      const isImage = /image\/(jpeg|jpg|png|heic)/i.test(file.type) || /\.(jpeg|jpg|png|heic)$/i.test(file.name);
      const isMp4 = file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4');
      if (isImage || isMp4) validFiles.push(file);
      else hasInvalid = true;
    }
    if (hasInvalid) alert("画像(JPG/PNG/HEIC)または動画(MP4)のみを選択してください。");
    return validFiles;
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (!disabled) onFilesSelected(validateFiles(Array.from(e.dataTransfer.files))); }}
        className={`
          relative overflow-hidden group border-2 border-dashed rounded-[2.5rem] p-12 transition-all duration-500
          ${isDragging ? 'border-blue-500 bg-blue-50 scale-[0.99] shadow-inner' : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-2xl'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => { if (!disabled && e.target.files) onFilesSelected(validateFiles(Array.from(e.target.files))); e.target.value = ''; }}
          accept="image/jpeg,image/jpg,image/png,image/heic,video/mp4"
          multiple
          className="hidden"
          disabled={disabled}
        />
        <div className="flex flex-col items-center text-center">
          <div className="bg-gray-50 p-6 rounded-full mb-6 group-hover:bg-blue-50 transition-all">
            <Upload className="w-10 h-10 text-gray-400 group-hover:text-blue-500" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tighter italic">DROP RECEIPTS HERE</h3>
          <p className="text-gray-400 text-sm font-medium">画像または動画(mp4)をドラッグ＆ドロップ</p>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;