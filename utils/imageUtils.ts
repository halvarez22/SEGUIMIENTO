/**
 * Resizes an image file to a maximum size while maintaining aspect ratio.
 * @param file The image file to resize.
 * @param maxSize The maximum width or height of the resized image.
 * @returns A promise that resolves to an object containing the base64 data and mime type.
 */
export const resizeImage = (
  file: File,
  maxSize: number
): Promise<{ base64Data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context'));
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Use JPEG for better compression of photographic images
        const mimeType = 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, 0.9); // 0.9 is a good quality setting
        const base64Data = dataUrl.split(',')[1];
        
        resolve({ base64Data, mimeType });
      };
      img.onerror = (error) => {
        reject(error);
      };
    };
    reader.onerror = (error) => {
      reject(error);
    };
  });
};
