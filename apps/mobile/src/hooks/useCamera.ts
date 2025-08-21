import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { launchCamera, launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import PermissionManager, { PermissionType } from '../utils/PermissionManager';

export interface CameraOptions {
  mediaType?: MediaType;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  includeBase64?: boolean;
  allowsEditing?: boolean;
}

export interface CameraResult {
  uri?: string;
  base64?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  type?: string;
  fileName?: string;
}

export interface UseCameraReturn {
  takePhoto: (options?: CameraOptions) => Promise<CameraResult | null>;
  selectFromGallery: (options?: CameraOptions) => Promise<CameraResult | null>;
  showImagePicker: (options?: CameraOptions) => Promise<CameraResult | null>;
  isLoading: boolean;
  error: string | null;
}

export const useCamera = (): UseCameraReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultOptions: CameraOptions = {
    mediaType: 'photo',
    quality: 0.8,
    maxWidth: 1024,
    maxHeight: 1024,
    includeBase64: false,
    allowsEditing: true,
  };

  const processImageResponse = useCallback((response: ImagePickerResponse): CameraResult | null => {
    if (response.didCancel || response.errorMessage) {
      if (response.errorMessage) {
        setError(response.errorMessage);
      }
      return null;
    }

    const asset = response.assets?.[0];
    if (!asset) {
      setError('No image selected');
      return null;
    }

    return {
      uri: asset.uri,
      base64: asset.base64,
      width: asset.width,
      height: asset.height,
      fileSize: asset.fileSize,
      type: asset.type,
      fileName: asset.fileName,
    };
  }, []);

  const takePhoto = useCallback(async (options?: CameraOptions): Promise<CameraResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Check camera permission
      const hasPermission = await PermissionManager.getInstance().ensurePermission(PermissionType.CAMERA);
      if (!hasPermission) {
        setError('Camera permission denied');
        return null;
      }

      const mergedOptions = { ...defaultOptions, ...options };

      return new Promise((resolve) => {
        launchCamera(
          {
            mediaType: mergedOptions.mediaType!,
            quality: mergedOptions.quality!,
            maxWidth: mergedOptions.maxWidth!,
            maxHeight: mergedOptions.maxHeight!,
            includeBase64: mergedOptions.includeBase64!,
            saveToPhotos: true,
          },
          (response) => {
            const result = processImageResponse(response);
            resolve(result);
          }
        );
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to take photo';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [processImageResponse]);

  const selectFromGallery = useCallback(async (options?: CameraOptions): Promise<CameraResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Check storage permission
      const hasPermission = await PermissionManager.getInstance().ensurePermission(PermissionType.STORAGE);
      if (!hasPermission) {
        setError('Storage permission denied');
        return null;
      }

      const mergedOptions = { ...defaultOptions, ...options };

      return new Promise((resolve) => {
        launchImageLibrary(
          {
            mediaType: mergedOptions.mediaType!,
            quality: mergedOptions.quality!,
            maxWidth: mergedOptions.maxWidth!,
            maxHeight: mergedOptions.maxHeight!,
            includeBase64: mergedOptions.includeBase64!,
            selectionLimit: 1,
          },
          (response) => {
            const result = processImageResponse(response);
            resolve(result);
          }
        );
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to select image';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [processImageResponse]);

  const showImagePicker = useCallback(async (options?: CameraOptions): Promise<CameraResult | null> => {
    return new Promise((resolve) => {
      Alert.alert(
        'Select Image',
        'Choose an option to add a photo',
        [
          {
            text: 'Camera',
            onPress: async () => {
              const result = await takePhoto(options);
              resolve(result);
            },
          },
          {
            text: 'Gallery',
            onPress: async () => {
              const result = await selectFromGallery(options);
              resolve(result);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(null),
          },
        ],
        { cancelable: true }
      );
    });
  }, [takePhoto, selectFromGallery]);

  return {
    takePhoto,
    selectFromGallery,
    showImagePicker,
    isLoading,
    error,
  };
};

// Hook for batch photo operations
export const useBatchCamera = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CameraResult[]>([]);

  const takeMultiplePhotos = useCallback(async (count: number, options?: CameraOptions): Promise<CameraResult[]> => {
    setIsLoading(true);
    setError(null);
    setResults([]);

    const photos: CameraResult[] = [];

    try {
      for (let i = 0; i < count; i++) {
        const { takePhoto } = useCamera();
        const photo = await takePhoto(options);
        if (photo) {
          photos.push(photo);
          setResults([...photos]);
        } else {
          break; // User cancelled or error occurred
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to take multiple photos';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }

    return photos;
  }, []);

  return {
    takeMultiplePhotos,
    isLoading,
    error,
    results,
  };
};

// Hook for product photo management
export const useProductCamera = () => {
  const camera = useCamera();

  const takeProductPhoto = useCallback(async (productId: string): Promise<CameraResult | null> => {
    const options: CameraOptions = {
      mediaType: 'photo',
      quality: 0.9,
      maxWidth: 1200,
      maxHeight: 1200,
      includeBase64: false,
      allowsEditing: true,
    };

    const result = await camera.showImagePicker(options);
    
    if (result) {
      // Add product ID to the result for tracking
      return {
        ...result,
        fileName: `product_${productId}_${Date.now()}.jpg`,
      };
    }

    return null;
  }, [camera]);

  return {
    ...camera,
    takeProductPhoto,
  };
};