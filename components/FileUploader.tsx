import React, { useState, useRef } from 'react';
import { Upload, FileVideo, ImageIcon } from 'lucide-react';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFilesSelected, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = (files: File[]): File[] => {
    const validFiles: File[] = [];
    for (const file of files) {
      const isImage = /image\/(jpeg|jpg|png|heic)/i.test(file.type) || /\.(jpeg|jpg|png|heic)$/i.test(file.name);
      const isMp4 = file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4');
      if (isImage || isMp4) validFiles.push(file);
    }
    return validFiles;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const files = validateFiles(Array.from(e.dataTransfer.files));
    if (files.length > 0) onFilesSelected(files);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`
        relative overflow-hidden group glass-card
        border-4 border-dashed rounded-[3.5rem] p-20 transition-all duration-700
        ${isDragging ? 'border-slate-400 bg-white/60 scale-[0.98]' : 'border-slate-200/50 hover:border-slate-400 hover:bg-white/60 hover:shadow-2xl'}
        ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}
      `}
      onClick={() => !disabled && fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => { if (!disabled && e.target.files) onFilesSelected(validateFiles(Array.from(e.target.files))); e.target.value = ''; }}
        accept="image/*,video/mp4"
        multiple
        className="hidden"
      />
      
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-10">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200 group-hover:rotate-12 transition-transform duration-500">
            <Upload className="w-12 h-12 text-white" />
          </div>
          <div className="absolute -top-4 -right-4 bg-slate-500 p-3 rounded-2xl shadow-lg border-4 border-white group-hover:-translate-y-2 transition-transform duration-500 delay-75">
            <ImageIcon className="w-5 h-5 text-white" />
          </div>
          <div className="absolute -bottom-4 -left-4 bg-zinc-400 p-3 rounded-2xl shadow-lg border-4 border-white group-hover:translate-y-2 transition-transform duration-500 delay-150">
            <FileVideo className="w-5 h-5 text-white" />
          </div>
        </div>
        
        <h3 className="text-4xl font-black text-slate-900 italic tracking-tighter mb-4 uppercase">
          Import <span className="text-slate-500">Assets</span>
        </h3>
        <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em]">Drop files or capture snapshots</p>
      </div>
    </div>
  );
};

export default FileUploader;