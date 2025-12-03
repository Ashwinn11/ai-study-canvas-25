'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase/client';
import { uploadProcessor, UploadProgress } from '@/lib/api/upload';
import { Upload, FileText, Image, Music, Link, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export default function UploadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [title, setTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'text' | 'youtube' | 'audio'>('file');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileUpload = async (file: File) => {
    if (!user) {
      setError('You must be logged in to upload files');
      return;
    }

    // Auto-generate title from filename if not provided
    const uploadTitle = title || file.name.replace(/\.[^/.]+$/, '');

    setUploadState('uploading');
    setError(null);
    setProgress(null);

    try {
      // Get access token
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      await uploadProcessor.processFile({
        userId: user.id,
        title: uploadTitle,
        file,
        accessToken: session.access_token,
        onProgress: (prog) => {
          setProgress(prog);
        },
      });

      setUploadState('success');

      // Redirect to seeds page after 2 seconds
      setTimeout(() => {
        router.push('/seeds');
      }, 2000);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploadState('error');
    }
  };

  const handleTextUpload = async () => {
    if (!user) {
      setError('You must be logged in to upload content');
      return;
    }

    if (!title.trim()) {
      setError('Please provide a title for your content');
      return;
    }

    if (!textContent.trim()) {
      setError('Please provide some text content');
      return;
    }

    setUploadState('uploading');
    setError(null);
    setProgress(null);

    try {
      // Get access token
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      await uploadProcessor.processFile({
        userId: user.id,
        title,
        textContent,
        accessToken: session.access_token,
        onProgress: (prog) => {
          setProgress(prog);
        },
      });

      setUploadState('success');

      // Redirect to seeds page after 2 seconds
      setTimeout(() => {
        router.push('/seeds');
      }, 2000);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploadState('error');
    }
  };

  const handleYoutubeUpload = async () => {
    if (!user) {
      setError('You must be logged in to upload content');
      return;
    }

    if (!youtubeUrl.trim()) {
      setError('Please provide a YouTube URL');
      return;
    }

    setUploadState('uploading');
    setError(null);
    setProgress(null);

    try {
      // Get access token
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      await uploadProcessor.processFile({
        userId: user.id,
        title: youtubeUrl,
        youtubeUrl,
        accessToken: session.access_token,
        onProgress: (prog) => {
          setProgress(prog);
        },
      });

      setUploadState('success');

      // Redirect to seeds page after 2 seconds
      setTimeout(() => {
        router.push('/seeds');
      }, 2000);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploadState('error');
    }
  };

  const resetUpload = () => {
    setUploadState('idle');
    setProgress(null);
    setError(null);
    setTitle('');
    setTextContent('');
    setYoutubeUrl('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Upload Study Material</h1>
        <p className="mt-2 text-gray-400">
          Upload PDFs, images, audio, video, or paste text content
        </p>
      </div>

      {/* Upload Mode Toggle */}
      <div className="flex gap-4">
        <Button
          variant={uploadMode === 'file' ? 'default' : 'outline'}
          onClick={() => setUploadMode('file')}
          disabled={uploadState === 'uploading'}
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload File
        </Button>
        <Button
          variant={uploadMode === 'text' ? 'default' : 'outline'}
          onClick={() => setUploadMode('text')}
          disabled={uploadState === 'uploading'}
        >
          <FileText className="h-4 w-4 mr-2" />
          Paste Text
        </Button>
        <Button
          variant={uploadMode === "youtube" ? "default" : "outline"}
          onClick={() => setUploadMode("youtube")}
          disabled={uploadState === "uploading"}
        >
          <Link className="h-4 w-4 mr-2" />
          YouTube Link
        </Button>
      </div>



      {/* File Upload Area */}
      {uploadMode === 'file' && (
        <div
          className={`rounded-lg border-2 border-dashed transition-colors ${
            isDragging
              ? 'border-primary bg-primary/10'
              : 'border-white/20 bg-white/5'
          } backdrop-blur-xl p-12`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            <Upload className="h-16 w-16 text-primary" />
            <div className="text-center">
              <p className="text-lg font-medium text-white">
                Drop your file here or click to browse
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Supports PDF, documents, images, and audio files
              </p>
            </div>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.mp3,.wav,.m4a,.aac,.ogg,.flac,.doc,.docx,.txt"
              disabled={uploadState === 'uploading'}
            />
            <Button
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={uploadState === 'uploading'}
            >
              Browse Files
            </Button>
          </div>

          {/* Supported File Types */}
          <div className="mt-8 grid grid-cols-3 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <FileText className="h-4 w-4" />
              <span>PDF, DOC</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Image className="h-4 w-4" />
              <span>Images</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Music className="h-4 w-4" />
              <span>Audio</span>
            </div>

          </div>
        </div>
      )}

      {/* Text Input Area */}
      {uploadMode === 'text' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="text-content" className="text-sm font-medium text-white">
              Content <span className="text-red-400">*</span>
            </label>
            <Textarea
              id="text-content"
              placeholder="Paste or type your study content here..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              disabled={uploadState === 'uploading'}
              className="min-h-[300px] bg-white/5 border-white/10 text-white"
            />
          </div>
          <Button
            onClick={handleTextUpload}
            disabled={uploadState === 'uploading' || !textContent.trim()}
            className="w-full"
          >
            {uploadState === 'uploading' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Process Content
              </>
            )}
          </Button>
        </div>
      )}

      {/* YouTube Link Input Area */}
      {uploadMode === 'youtube' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="youtube-url" className="text-sm font-medium text-white">
              YouTube URL <span className="text-red-400">*</span>
            </label>
            <Input
              id="youtube-url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              disabled={uploadState === 'uploading'}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <Button
            onClick={handleYoutubeUpload}
            disabled={uploadState === 'uploading' || !youtubeUrl.trim()}
            className="w-full"
          >
            {uploadState === 'uploading' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Process YouTube Video
              </>
            )}
          </Button>
        </div>
      )}

      {/* Progress Display */}
      {uploadState === 'uploading' && progress && (
        <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">{progress.message}</span>
            <span className="text-sm text-gray-400">{progress.progress}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <div className="flex gap-2 text-xs text-gray-400">
            <span className={progress.stage === 'validating' ? 'text-primary' : ''}>Validating</span>
            <span>→</span>
            <span className={progress.stage === 'reading' ? 'text-primary' : ''}>Reading</span>
            <span>→</span>
            <span className={progress.stage === 'extracting' ? 'text-primary' : ''}>Extracting</span>
            <span>→</span>
            <span className={progress.stage === 'generating' ? 'text-primary' : ''}>Generating</span>
            <span>→</span>
            <span className={progress.stage === 'finalizing' ? 'text-primary' : ''}>Finalizing</span>
          </div>
        </div>
      )}

      {/* Success Message */}
      {uploadState === 'success' && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/10 backdrop-blur-xl p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            <div>
              <p className="font-medium text-green-500">Upload successful!</p>
              <p className="text-sm text-gray-400 mt-1">
                Redirecting to your study materials...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {uploadState === 'error' && error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 backdrop-blur-xl p-6">
          <div className="flex items-start gap-3">
            <XCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-500">Upload failed</p>
              <p className="text-sm text-gray-400 mt-1">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetUpload}
            >
              Try Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
