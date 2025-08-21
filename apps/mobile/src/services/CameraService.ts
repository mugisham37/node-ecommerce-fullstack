import { Alert, Linking, Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { launchCamera, launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import RNFS from 'react-native-fs';

export interface CameraOptions {
  mediaType?: MediaType;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  includeBase64?: boolean;
  storageOptions?: {
    skipBackup?: boolean;
    path?: string;
  };
}

export interface ImageResult {
  uri: string;
  fileName?: string;
  fileSize?: number;
  type?: string;
  width?: number;
  height?: number;
  base64?: string;
}

class CameraService {
  private hasPermission = false;

  /**
   * Check camera permission
   */
  async checkCameraPermission(): Promise<boolean> {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.CAMERA 
        : PERMISSIONS.ANDROID.CAMERA;

      const result = await check(permission);
      
      switch (result) {
        case RESULTS.GRANTED:
          this.hasPermission = true;
          return true;
        case RESULTS.DENIED:
          return await this.requestCameraPermission();
        case RESULTS.BLOCKED:
          this.showPermissionBlockedAlert();
          return false;
        case RESULTS.UNAVAILABLE:
          Alert.alert(
            'Camera Unavailable',
            'Camera is not available on this device.',
            [{ text: 'OK' }]
          );
          return false;
        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking camera permission:', error);
      return false;
    }
  }

  /**
   * Check photo library permission
   */
  async checkPhotoLibraryPermission(): Promise<boolean> {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.PHOTO_LIBRARY 
        : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;

      const result = await check(permission);
      
      switch (result) {
        case RESULTS.GRANTED:
          return true;
        case RESULTS.DENIED:
          return await this.requestPhotoLibraryPermission();
        case RESULTS.BLOCKED:
          this.showPhotoLibraryPermissionBlockedAlert();
          return false;
        case RESULTS.UNAVAILABLE:
          return true; // Some devices don't require this permission
        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking photo library permission:', error);
      return false;
    }
  }

  /**
   * Request camera permission
   */
  private async requestCameraPermission(): Promise<boolean> {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.CAMERA 
        : PERMISSIONS.ANDROID.CAMERA;

      const result = await request(permission);
      
      switch (result) {
        case RESULTS.GRANTED:
          this.hasPermission = true;
          return true;
        case RESULTS.DENIED:
        case RESULTS.BLOCKED:
          this.showPermissionDeniedAlert();
          return false;
        default:
          return false;
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  }

  /**
   * Request photo library permission
   */
  private async requestPhotoLibraryPermission(): Promise<boolean> {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.PHOTO_LIBRARY 
        : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;

      const result = await request(permission);
      
      switch (result) {
        case RESULTS.GRANTED:
          return true;
        case RESULTS.DENIED:
        case RESULTS.BLOCKED:
          this.showPhotoLibraryPermissionDeniedAlert();
          return false;
        default:
          return false;
      }
    } catch (error) {
      console.error('Error requesting photo library permission:', error);
      return false;
    }
  }

  /**
   * Show camera permission blocked alert
   */
  private showPermissionBlockedAlert(): void {
    Alert.alert(
      'Camera Permission Required',
      'Camera access is required to take photos. Please enable camera permission in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => Linking.openSettings() 
        }
      ]
    );
  }

  /**
   * Show camera permission denied alert
   */
  private showPermissionDeniedAlert(): void {
    Alert.alert(
      'Camera Permission Denied',
      'Camera access is required to take photos. Please grant camera permission to continue.',
      [{ text: 'OK' }]
    );
  }

  /**
   * Show photo library permission blocked alert
   */
  private showPhotoLibraryPermissionBlockedAlert(): void {
    Alert.alert(
      'Photo Library Permission Required',
      'Photo library access is required to select images. Please enable photo library permission in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => Linking.openSettings() 
        }
      ]
    );
  }

  /**
   * Show photo library permission denied alert
   */
  private showPhotoLibraryPermissionDeniedAlert(): void {
    Alert.alert(
      'Photo Library Permission Denied',
      'Photo library access is required to select images. Please grant photo library permission to continue.',
      [{ text: 'OK' }]
    );
  }

  /**
   * Take a photo using the camera
   */
  async takePhoto(options: CameraOptions = {}): Promise<ImageResult | null> {
    const hasPermission = await this.checkCameraPermission();
    if (!hasPermission) {
      return null;
    }

    return new Promise((resolve) => {
      const cameraOptions = {
        mediaType: options.mediaType || 'photo' as MediaType,
        quality: options.quality || 0.8,
        maxWidth: options.maxWidth || 1024,
        maxHeight: options.maxHeight || 1024,
        includeBase64: options.includeBase64 || false,
        storageOptions: {
          skipBackup: true,
          path: 'images',
          ...options.storageOptions,
        },
      };

      launchCamera(cameraOptions, (response: ImagePickerResponse) => {
        if (response.didCancel || response.errorMessage) {
          if (response.errorMessage) {
            console.error('Camera error:', response.errorMessage);
            Alert.alert('Camera Error', response.errorMessage);
          }
          resolve(null);
          return;
        }

        const asset = response.assets?.[0];
        if (!asset) {
          resolve(null);
          return;
        }

        const result: ImageResult = {
          uri: asset.uri!,
          fileName: asset.fileName,
          fileSize: asset.fileSize,
          type: asset.type,
          width: asset.width,
          height: asset.height,
          base64: asset.base64,
        };

        resolve(result);
      });
    });
  }

  /**
   * Select an image from the photo library
   */
  async selectFromLibrary(options: CameraOptions = {}): Promise<ImageResult | null> {
    const hasPermission = await this.checkPhotoLibraryPermission();
    if (!hasPermission) {
      return null;
    }

    return new Promise((resolve) => {
      const libraryOptions = {
        mediaType: options.mediaType || 'photo' as MediaType,
        quality: options.quality || 0.8,
        maxWidth: options.maxWidth || 1024,
        maxHeight: options.maxHeight || 1024,
        includeBase64: options.includeBase64 || false,
        selectionLimit: 1,
      };

      launchImageLibrary(libraryOptions, (response: ImagePickerResponse) => {
        if (response.didCancel || response.errorMessage) {
          if (response.errorMessage) {
            console.error('Image library error:', response.errorMessage);
            Alert.alert('Image Selection Error', response.errorMessage);
          }
          resolve(null);
          return;
        }

        const asset = response.assets?.[0];
        if (!asset) {
          resolve(null);
          return;
        }

        const result: ImageResult = {
          uri: asset.uri!,
          fileName: asset.fileName,
          fileSize: asset.fileSize,
          type: asset.type,
          width: asset.width,
          height: asset.height,
          base64: asset.base64,
        };

        resolve(result);
      });
    });
  }

  /**
   * Show image picker options (camera or library)
   */
  async showImagePicker(options: CameraOptions = {}): Promise<ImageResult | null> {
    return new Promise((resolve) => {
      Alert.alert(
        'Select Image',
        'Choose an option to select an image',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
          {
            text: 'Camera',
            onPress: async () => {
              const result = await this.takePhoto(options);
              resolve(result);
            },
          },
          {
            text: 'Photo Library',
            onPress: async () => {
              const result = await this.selectFromLibrary(options);
              resolve(result);
            },
          },
        ]
      );
    });
  }

  /**
   * Resize image to specified dimensions
   */
  async resizeImage(
    uri: string,
    width: number,
    height: number,
    quality: number = 0.8
  ): Promise<string | null> {
    try {
      // This would typically use a library like react-native-image-resizer
      // For now, we'll return the original URI
      console.log('Image resize requested:', { uri, width, height, quality });
      return uri;
    } catch (error) {
      console.error('Error resizing image:', error);
      return null;
    }
  }

  /**
   * Compress image to reduce file size
   */
  async compressImage(uri: string, quality: number = 0.8): Promise<string | null> {
    try {
      // This would typically use a library like react-native-image-resizer
      // For now, we'll return the original URI
      console.log('Image compression requested:', { uri, quality });
      return uri;
    } catch (error) {
      console.error('Error compressing image:', error);
      return null;
    }
  }

  /**
   * Get image metadata
   */
  async getImageMetadata(uri: string): Promise<{
    width?: number;
    height?: number;
    size?: number;
    type?: string;
  } | null> {
    try {
      const stats = await RNFS.stat(uri);
      
      return {
        size: stats.size,
        // Width and height would need to be extracted using a native module
        // or image processing library
      };
    } catch (error) {
      console.error('Error getting image metadata:', error);
      return null;
    }
  }

  /**
   * Delete temporary image file
   */
  async deleteImage(uri: string): Promise<boolean> {
    try {
      const exists = await RNFS.exists(uri);
      if (exists) {
        await RNFS.unlink(uri);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  /**
   * Copy image to app's document directory
   */
  async saveImageToDocuments(uri: string, fileName?: string): Promise<string | null> {
    try {
      const documentsPath = RNFS.DocumentDirectoryPath;
      const timestamp = Date.now();
      const finalFileName = fileName || `image_${timestamp}.jpg`;
      const destinationPath = `${documentsPath}/${finalFileName}`;

      await RNFS.copyFile(uri, destinationPath);
      return destinationPath;
    } catch (error) {
      console.error('Error saving image to documents:', error);
      return null;
    }
  }

  /**
   * Validate image file
   */
  validateImage(result: ImageResult): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!result.uri) {
      errors.push('Image URI is missing');
    }

    if (result.fileSize && result.fileSize > 10 * 1024 * 1024) { // 10MB limit
      errors.push('Image file size is too large (max 10MB)');
    }

    if (result.type && !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(result.type)) {
      errors.push('Unsupported image format');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const cameraService = new CameraService();
export default cameraService;