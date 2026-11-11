'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { DocumentType } from '@/types/database.types';
import { validateFile, DOCUMENT_TYPE_LABELS } from '@/lib/membership/validation';
import { uploadDocument } from '@/lib/membership/storage';

interface DocumentUploadProps {
  documentType: DocumentType;
  value?: string;
  onChange: (url: string, fileName?: string, fileSize?: number) => void;
  error?: string;
  userId: string | null;
}

export default function DocumentUpload({
  documentType,
  value,
  onChange,
  error,
  userId,
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [currentFileSize, setCurrentFileSize] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    // Check if userId is available
    if (!userId) {
      setUploadError('Create an account before uploading documents');
      return;
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(0);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90));
    }, 200);

    try {
      const result = await uploadDocument(file, userId, documentType);
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success && result.url) {
        setCurrentFileName(file.name);
        setCurrentFileSize(file.size);
        onChange(result.url, file.name, file.size);
        setPreviewUrl(result.url);
      } else {
        setUploadError(result.error || 'Could not upload file');
        setPreviewUrl(null);
      }
    } catch (err) {
      clearInterval(progressInterval);
      setUploadError('Upload failed');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setCurrentFileName('');
    setCurrentFileSize(0);
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const displayError = error || uploadError;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {DOCUMENT_TYPE_LABELS[documentType]}
        <span className="text-red-500 ml-1">*</span>
      </label>

      {!previewUrl ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'} ${displayError ? 'border-red-300 bg-red-50' : ''} ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isUploading}
          />

          {isUploading ? (
            <div className="space-y-3">
              <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm text-gray-600">Uploading...</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-xs text-gray-500">{uploadProgress}%</p>
              </div>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 mb-1">Click to upload or drag and drop files here</p>
              <p className="text-xs text-gray-500">Supports JPG, PNG, PDF (max 5MB)</p>
            </>
          )}
        </div>
      ) : (
        <div className="relative border-2 border-gray-300 rounded-lg p-4">
          <button type="button" onClick={handleRemove} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600" title="Delete file">
            <X className="w-4 h-4" />
          </button>

          {previewUrl.endsWith('.pdf') ? (
            <div className="flex items-center space-x-3">
              <FileText className="w-12 h-12 text-red-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{DOCUMENT_TYPE_LABELS[documentType]}</p>
                <p className="text-xs text-gray-500">PDF Document</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <img src={previewUrl} alt={DOCUMENT_TYPE_LABELS[documentType]} className="w-full h-48 object-contain rounded" />
              <p className="text-xs text-center text-gray-500">{DOCUMENT_TYPE_LABELS[documentType]}</p>
            </div>
          )}
        </div>
      )}

      {displayError && <p className="text-sm text-red-600">⚠️ {displayError}</p>}
      <p className="text-xs text-gray-500">💡 Please take a clear photo with all text readable</p>
    </div>
  );
}
