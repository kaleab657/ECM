/**
 * Compress an image for upload.
 * Android WebView has tighter fetch body size limits than desktop browsers.
 * Targeting < 800KB to avoid silent fetch failures on mobile.
 */
export const compressImage = (file: File, maxWidth = 900, maxHeight = 900, quality = 0.7): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas to Blob conversion failed'));
              return;
            }
            // If still over 800KB, re-compress at lower quality
            if (blob.size > 800 * 1024 && quality > 0.4) {
              canvas.toBlob(
                (smallerBlob) => {
                  resolve(smallerBlob || blob);
                },
                'image/jpeg',
                0.5
              );
            } else {
              resolve(blob);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};
