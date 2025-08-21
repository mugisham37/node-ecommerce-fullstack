import sharp from 'sharp';
import { FileMetadata, ImageProcessingOptions } from './types';

export class ImageProcessingService {
  // Standard image sizes for different use cases
  private static readonly IMAGE_SIZES = {
    thumbnail: { width: 150, height: 150 },
    small: { width: 300, height: 300 },
    medium: { width: 600, height: 600 },
    large: { width: 1200, height: 1200 },
    original: { width: 0, height: 0 } // Keep original size
  };

  async processImage(
    imageBuffer: Buffer, 
    options: ImageProcessingOptions = {}
  ): Promise<Record<string, Buffer>> {
    if (!this.isImageBuffer(imageBuffer)) {
      throw new Error('Buffer is not a valid image');
    }

    const processedImages: Record<string, Buffer> = {};
    const sizes = options.sizes || ImageProcessingService.IMAGE_SIZES;

    // Process each size variant
    for (const [sizeName, dimensions] of Object.entries(sizes)) {
      try {
        let processedImage: Buffer;
        
        if (sizeName === 'original' || (dimensions.width === 0 && dimensions.height === 0)) {
          processedImage = await this.optimizeImage(imageBuffer, options);
        } else {
          processedImage = await this.resizeImage(imageBuffer, dimensions, options);
        }

        processedImages[sizeName] = processedImage;
        console.log(`Processed image variant: ${sizeName} (${dimensions.width}x${dimensions.height})`);

      } catch (error) {
        console.error(`Failed to process image variant: ${sizeName}`, error);
        // Continue processing other variants
      }
    }

    return processedImages;
  }

  async extractImageMetadata(imageBuffer: Buffer): Promise<FileMetadata> {
    if (!this.isImageBuffer(imageBuffer)) {
      return {
        format: 'unknown',
        isImage: false
      };
    }

    try {
      const metadata = await sharp(imageBuffer).metadata();
      
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format || 'unknown',
        isImage: true
      };
    } catch (error) {
      console.error('Failed to extract image metadata', error);
      return {
        format: 'unknown',
        isImage: true
      };
    }
  }

  async resizeImage(
    imageBuffer: Buffer, 
    dimensions: { width: number; height: number },
    options: ImageProcessingOptions = {}
  ): Promise<Buffer> {
    try {
      let sharpInstance = sharp(imageBuffer);

      // Resize with aspect ratio preservation
      if (dimensions.width > 0 && dimensions.height > 0) {
        sharpInstance = sharpInstance.resize(dimensions.width, dimensions.height, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Apply format conversion if specified
      if (options.format) {
        switch (options.format) {
          case 'jpeg':
            sharpInstance = sharpInstance.jpeg({ 
              quality: options.quality || 85,
              progressive: true 
            });
            break;
          case 'png':
            sharpInstance = sharpInstance.png({ 
              compressionLevel: 6,
              progressive: true 
            });
            break;
          case 'webp':
            sharpInstance = sharpInstance.webp({ 
              quality: options.quality || 85 
            });
            break;
        }
      }

      return await sharpInstance.toBuffer();
    } catch (error) {
      throw new Error(`Failed to resize image: ${error.message}`);
    }
  }

  async optimizeImage(
    imageBuffer: Buffer, 
    options: ImageProcessingOptions = {}
  ): Promise<Buffer> {
    try {
      let sharpInstance = sharp(imageBuffer);

      // Get original metadata to determine format
      const metadata = await sharp(imageBuffer).metadata();
      const originalFormat = metadata.format;

      // Apply optimization based on format
      switch (originalFormat) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({
            quality: options.quality || 85,
            progressive: true,
            mozjpeg: true
          });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({
            compressionLevel: 6,
            progressive: true
          });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({
            quality: options.quality || 85
          });
          break;
        default:
          // Convert to JPEG for other formats
          sharpInstance = sharpInstance.jpeg({
            quality: options.quality || 85,
            progressive: true
          });
      }

      return await sharpInstance.toBuffer();
    } catch (error) {
      throw new Error(`Failed to optimize image: ${error.message}`);
    }
  }

  async convertFormat(
    imageBuffer: Buffer, 
    targetFormat: 'jpeg' | 'png' | 'webp',
    quality: number = 85
  ): Promise<Buffer> {
    try {
      let sharpInstance = sharp(imageBuffer);

      switch (targetFormat) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({ 
            quality,
            progressive: true 
          });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({ 
            compressionLevel: 6,
            progressive: true 
          });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({ 
            quality 
          });
          break;
      }

      return await sharpInstance.toBuffer();
    } catch (error) {
      throw new Error(`Failed to convert image format: ${error.message}`);
    }
  }

  async compressImage(
    imageBuffer: Buffer, 
    quality: number = 85
  ): Promise<Buffer> {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      const format = metadata.format;

      let sharpInstance = sharp(imageBuffer);

      switch (format) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({ 
            quality,
            progressive: true,
            mozjpeg: true 
          });
          break;
        case 'png':
          // PNG doesn't use quality, use compression level instead
          const compressionLevel = Math.round((100 - quality) / 10);
          sharpInstance = sharpInstance.png({ 
            compressionLevel: Math.max(0, Math.min(9, compressionLevel))
          });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({ 
            quality 
          });
          break;
        default:
          // Convert to JPEG for compression
          sharpInstance = sharpInstance.jpeg({ 
            quality,
            progressive: true 
          });
      }

      return await sharpInstance.toBuffer();
    } catch (error) {
      throw new Error(`Failed to compress image: ${error.message}`);
    }
  }

  generateVariantFileName(originalFileName: string, variant: string): string {
    const lastDotIndex = originalFileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return `${originalFileName}_${variant}`;
    }
    
    const nameWithoutExt = originalFileName.substring(0, lastDotIndex);
    const extension = originalFileName.substring(lastDotIndex);
    return `${nameWithoutExt}_${variant}${extension}`;
  }

  private async isImageBuffer(buffer: Buffer): Promise<boolean> {
    try {
      await sharp(buffer).metadata();
      return true;
    } catch {
      return false;
    }
  }

  private getImageFormat(fileName: string): string {
    const extension = this.getFileExtension(fileName);
    switch (extension.toLowerCase()) {
      case 'jpg':
      case 'jpeg':
        return 'jpeg';
      case 'png':
        return 'png';
      case 'gif':
        return 'gif';
      case 'webp':
        return 'webp';
      default:
        return 'jpeg'; // Default to JPEG
    }
  }

  private getFileExtension(fileName: string): string {
    if (!fileName) return '';
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1) : '';
  }
}