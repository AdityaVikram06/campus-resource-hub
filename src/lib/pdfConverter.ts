import { PDFDocument } from 'pdf-lib';

export const MAX_DOCUMENT_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
export const MAX_AVATAR_FILE_SIZE = 3 * 1024 * 1024; // 3 MB

export const ACCEPTED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

export interface ValidationResult {
  valid: boolean;
  error?: string;
  isImage: boolean;
}

export function validateDocumentFile(file: File): ValidationResult {
  // Check size
  if (file.size > MAX_DOCUMENT_FILE_SIZE) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      isImage: false,
      error: `File size (${sizeInMb}MB) exceeds the maximum allowed limit of 20MB.`,
    };
  }

  // Check type & extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  const isPdf = file.type === 'application/pdf' || extension === '.pdf';
  const isImage =
    file.type.startsWith('image/') ||
    ['.jpg', '.jpeg', '.png', '.webp'].includes(extension);

  if (!isPdf && !isImage) {
    return {
      valid: false,
      isImage: false,
      error: `Unsupported file format (${extension || file.type}). Please upload a PDF or image (JPEG, PNG, WEBP).`,
    };
  }

  return {
    valid: true,
    isImage,
  };
}

/**
 * Converts an image file (PNG, JPG, WEBP) to a standardized PDF Blob using pdf-lib.
 * Handles client-side canvas rasterization if needed to support all image types.
 */
export async function convertImageToPdf(file: File): Promise<{ pdfBlob: Blob; pdfFile: File; pageCount: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.create();

  let embeddedImage;
  const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
  const isJpg =
    file.type === 'image/jpeg' ||
    file.name.toLowerCase().endsWith('.jpg') ||
    file.name.toLowerCase().endsWith('.jpeg');

  try {
    if (isPng) {
      embeddedImage = await pdfDoc.embedPng(arrayBuffer);
    } else if (isJpg) {
      embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
    } else {
      // For WEBP or other browser-supported images, convert via an offscreen HTML Canvas
      const pngBlob = await convertImageBlobToPng(file);
      const pngBuffer = await pngBlob.arrayBuffer();
      embeddedImage = await pdfDoc.embedPng(pngBuffer);
    }
  } catch {
    // Fallback: load into Image element and convert to PNG via canvas
    const pngBlob = await convertImageBlobToPng(file);
    const pngBuffer = await pngBlob.arrayBuffer();
    embeddedImage = await pdfDoc.embedPng(pngBuffer);
  }

  const { width: imgWidth, height: imgHeight } = embeddedImage;

  // Standard A4 dimensions in points: 595.28 x 841.89
  const a4Width = 595.28;
  const a4Height = 841.89;

  // Scale image to fit neatly within A4 with 30pt margins
  const margin = 36; // 0.5 inch margins
  const maxWidth = a4Width - margin * 2;
  const maxHeight = a4Height - margin * 2;

  const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1);
  const renderWidth = imgWidth * scale;
  const renderHeight = imgHeight * scale;

  const page = pdfDoc.addPage([a4Width, a4Height]);
  const x = (a4Width - renderWidth) / 2;
  const y = (a4Height - renderHeight) / 2;

  page.drawImage(embeddedImage, {
    x,
    y,
    width: renderWidth,
    height: renderHeight,
  });

  const pdfBytes = await pdfDoc.save();
  const pdfBlob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });

  // Generate clean filename
  const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
  const convertedFileName = `${baseName}.pdf`;
  const convertedFile = new File([pdfBlob], convertedFileName, { type: 'application/pdf' });

  return {
    pdfBlob,
    pdfFile: convertedFile,
    pageCount: 1,
  };
}

/**
 * Converts any browser-renderable image Blob to a PNG Blob via HTML5 Canvas.
 */
function convertImageBlobToPng(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Canvas conversion only available in browser environment'));
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Failed to create canvas context'));
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob failed'));
        }
      }, 'image/png');
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image into canvas'));
    };

    img.src = objectUrl;
  });
}
