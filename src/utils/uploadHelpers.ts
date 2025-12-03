import { configService } from '@/lib/api/configService';

/**
 * Format bytes to human-readable file size
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

/**
 * Check if file type is supported
 */
export const isSupportedFileType = (filename: string): boolean => {
  const supportedTypes = ['pdf', 'doc', 'docx', 'txt', 'md', 'jpg', 'jpeg', 'png', 'gif'];
  const extension = getFileExtension(filename).toLowerCase();
  return supportedTypes.includes(extension);
};

/**
 * Validate file size against limits
 */
export const validateFileSize = async (file: File): Promise<{ valid: boolean; error?: string }> => {
  const maxSize = await configService.getMaxFileSize();
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size (${formatBytes(file.size)}) exceeds maximum allowed size (${formatBytes(maxSize)})`
    };
  }
  
  return { valid: true };
};

/**
 * Generate a unique filename
 */
export const generateUniqueFilename = (originalName: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = getFileExtension(originalName);
  const nameWithoutExt = originalName.replace(`.${extension}`, '');
  
  return `${nameWithoutExt}_${timestamp}_${random}.${extension}`;
};

/**
 * Extract text content from file (placeholder implementation)
 */
export const extractTextFromFile = async (file: File): Promise<string> => {
  // This is a simplified implementation
  // In a real app, you'd use appropriate libraries for different file types
  if (file.type.startsWith('text/') || file.type === 'application/json') {
    return await file.text();
  }
  
  // For other file types, you'd need specialized parsing libraries
  throw new Error(`Text extraction not supported for file type: ${file.type}`);
};

/**
 * Sanitize filename for safe storage
 */
export const sanitizeFilename = (filename: string): string => {
  // Remove or replace invalid characters
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
};

/**
 * Get MIME type from file extension
 */
export const getMimeTypeFromExtension = (extension: string): string => {
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
  };
  
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
};

/**
 * Check if file is an image
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

/**
 * Check if file is a document
 */
export const isDocumentFile = (file: File): boolean => {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
  ];
  
  return documentTypes.includes(file.type);
};

/**
 * Create a preview URL for a file
 */
export const createPreviewUrl = (file: File): string => {
  return URL.createObjectURL(file);
};

/**
 * Revoke a preview URL to free memory
 */
export const revokePreviewUrl = (url: string): void => {
  URL.revokeObjectURL(url);
};