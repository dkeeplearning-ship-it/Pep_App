import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Upload, 
  X, 
  File, 
  FileText, 
  Image, 
  FileSpreadsheet,
  Loader2
} from "lucide-react";
import { uploadAPI } from "@/lib/api";

interface FileUploadProps {
  onFilesUploaded: (files: Array<{
    id: string;
    originalName: string;
    filename: string;
    url: string;
    size: number;
  }>) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  existingFiles?: Array<{
    id: string;
    originalName: string;
    filename: string;
    url: string;
    size: number;
  }>;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesUploaded,
  maxFiles = 5,
  maxFileSize = 10,
  acceptedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif'
  ],
  existingFiles = []
}) => {
  const [files, setFiles] = useState(existingFiles);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimetype.includes('pdf')) return <FileText className="h-4 w-4" />;
    if (mimetype.includes('spreadsheet') || mimetype.includes('excel')) return <FileSpreadsheet className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File) => {
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      toast.error(`File type ${file.type} is not allowed`);
      return false;
    }

    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      toast.error(`File size must be less than ${maxFileSize}MB`);
      return false;
    }

    return true;
  };

  const handleFileSelect = async (selectedFiles: FileList) => {
    const validFiles: File[] = [];

    // Validate each file
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (validateFile(file)) {
        validFiles.push(file);
      }
    }

    // Check total file count
    if (files.length + validFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    if (validFiles.length === 0) return;

    try {
      setUploading(true);

      // Upload files
      const uploadPromises = validFiles.map(file => uploadAPI.uploadSingleFile(file));
      const uploadResults = await Promise.all(uploadPromises);

      // Add uploaded files to state
      const newFiles = uploadResults.map(result => result.data);
      const updatedFiles = [...files, ...newFiles];
      
      setFiles(updatedFiles);
      onFilesUploaded(updatedFiles);
      
      toast.success(`${validFiles.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removeFile = async (fileToRemove: any) => {
    try {
      // Delete from server
      await uploadAPI.deleteFile(fileToRemove.filename);
      
      // Remove from state
      const updatedFiles = files.filter(file => file.id !== fileToRemove.id);
      setFiles(updatedFiles);
      onFilesUploaded(updatedFiles);
      
      toast.success('File removed successfully');
    } catch (error) {
      console.error('Error removing file:', error);
      toast.error('Failed to remove file');
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          className="hidden"
        />
        
        <div className="space-y-2">
          <Upload className="h-8 w-8 text-gray-400 mx-auto" />
          <div>
            <p className="text-sm text-gray-600">
              Drag and drop files here, or{' '}
              <button
                type="button"
                onClick={openFileDialog}
                className="text-blue-600 hover:text-blue-700 font-medium"
                disabled={uploading}
              >
                browse
              </button>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Max {maxFiles} files, {maxFileSize}MB each. PDF, Word, PowerPoint, Text, Images allowed.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Uploading files...
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploaded Files ({files.length})</h4>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getFileIcon(file.originalName)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {file.originalName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Uploaded
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFile(file)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
