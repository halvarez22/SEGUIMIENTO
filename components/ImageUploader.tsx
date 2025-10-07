import React, { useRef } from 'react';
import { Spinner } from './icons';

interface ImageUploaderProps {
  onFileSelect: (files: File[]) => void;
  imagePreview: string | null;
  isLoading: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onFileSelect, imagePreview, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // The confirmation dialog was blocked in the sandboxed environment,
      // preventing uploads. Removing it to fix the core functionality.
      onFileSelect(Array.from(files));

      // Clear the file input to allow selecting the same file again.
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleClick = () => {
    if (isLoading) return;
    fileInputRef.current?.click();
  };

  const uploaderClasses = `relative w-full h-56 sm:h-64 border-2 border-dashed border-gray-500 rounded-md flex items-center justify-center bg-gray-900/50 overflow-hidden transition-colors ${
    isLoading ? 'cursor-wait' : 'cursor-pointer hover:border-blue-500'
  }`;

  return (
    <div className="w-full p-4 bg-gray-800 rounded-lg shadow-xl border border-gray-700">
      <div
        className={uploaderClasses}
        onClick={handleClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/png, image/jpeg, image/webp"
          disabled={isLoading}
          multiple
        />
        {imagePreview ? (
          <img src={imagePreview} alt="Preview" className="h-full w-full object-contain" />
        ) : (
          <div className="text-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 sm:h-12 sm:w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mt-2 text-sm sm:text-base">Click to upload image(s)</p>
            <p className="text-xs">PNG, JPG, WEBP</p>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center rounded-md backdrop-blur-sm">
            <Spinner />
          </div>
        )}
      </div>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="mt-4 w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      >
        {isLoading ? 'Processing...' : imagePreview ? 'Upload More Images' : 'Select Image(s)'}
      </button>
    </div>
  );
};