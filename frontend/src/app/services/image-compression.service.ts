import { Injectable } from '@angular/core';
import imageCompression from 'browser-image-compression';

/** Options applied before uploading any product image. */
const COMPRESSION_OPTIONS = {
  /** Target size in MB (browser-image-compression uses this as a ceiling). */
  maxSizeMB: 1,
  /** Maximum width in pixels. Height is scaled proportionally. */
  maxWidthOrHeight: 1280,
  /**
   * Preserve the original EXIF orientation so that photos taken on mobile
   * devices are not displayed rotated or flipped.
   */
  useWebWorker: true,
  preserveExifOrientation: true,
  /** Attempt to use WebP output when the browser supports it. */
  fileType: 'image/webp' as const,
  /**
   * Log progress to the console while developing.
   * Set to false (or remove) in production.
   */
  onProgress: (progress: number) => {
    if (progress % 25 === 0) {
      console.debug(`[ImageCompression] ${progress}%`);
    }
  },
};

@Injectable({
  providedIn: 'root',
})
export class ImageCompressionService {
  /**
   * Compress an image File before uploading it.
   *
   * @param file  The raw File selected by the user.
   * @returns     A new, compressed File ready to append to a FormData.
   */
  async compress(file: File): Promise<File> {
    try {
      const compressed = await imageCompression(file, COMPRESSION_OPTIONS);

      // imageCompression returns a Blob; wrap it back in a File so the
      // browser retains the original filename for FormData submissions.
      return new File([compressed], this.buildFilename(file.name), {
        type: compressed.type,
        lastModified: Date.now(),
      });
    } catch (error) {
      console.error('[ImageCompressionService] Compression failed:', error);
      // Fall back to the original file if compression throws.
      return file;
    }
  }

  /** Replace the extension with .webp while keeping the base name. */
  private buildFilename(originalName: string): string {
    const baseName = originalName.replace(/\.[^.]+$/, '');
    return `${baseName}.webp`;
  }
}
