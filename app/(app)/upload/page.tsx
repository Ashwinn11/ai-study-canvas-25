import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Upload - Masterly',
  description: 'Upload study materials',
};

export default function UploadPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Upload Study Material</h1>
        <p className="mt-2 text-gray-400">
          Upload PDFs, images, audio, video, or text documents
        </p>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl p-8">
        <div className="text-center text-gray-400">
          <p>Upload functionality coming soon...</p>
          <p className="text-sm mt-2">This will integrate with the backend document processing API</p>
        </div>
      </div>
    </div>
  );
}
