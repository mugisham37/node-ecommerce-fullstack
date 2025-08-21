import { Alert, Linking, Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export interface BarcodeResult {
  data: string;
  type: string;
  bounds?: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
}

export interface ScanOptions {
  showFlashButton?: boolean;
  showMarker?: boolean;
  markerColor?: string;
  cameraType?: 'front' | 'back';
  onCodeScanned?: (result: BarcodeResult) => void;
  onError?: (error: Error) => void;
}

class BarcodeScannerService {
  private isScanning = false;
  private hasPermission = false;

  /**
   * Check if the device has camera permission
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
   * Request camera permission from the user
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
   * Show alert when permission is blocked
   */
  private showPermissionBlockedAlert(): void {
    Alert.alert(
      'Camera Permission Required',
      'Camera access is required to scan barcodes. Please enable camera permission in your device settings.',
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
   * Show alert when permission is denied
   */
  private showPermissionDeniedAlert(): void {
    Alert.alert(
      'Camera Permission Denied',
      'Camera access is required to scan barcodes. Please grant camera permission to continue.',
      [{ text: 'OK' }]
    );
  }

  /**
   * Start barcode scanning
   */
  async startScanning(options: ScanOptions = {}): Promise<boolean> {
    if (this.isScanning) {
      console.warn('Scanner is already running');
      return false;
    }

    const hasPermission = await this.checkCameraPermission();
    if (!hasPermission) {
      return false;
    }

    try {
      this.isScanning = true;
      return true;
    } catch (error) {
      console.error('Error starting barcode scanner:', error);
      this.isScanning = false;
      
      if (options.onError) {
        options.onError(error as Error);
      }
      
      return false;
    }
  }

  /**
   * Stop barcode scanning
   */
  stopScanning(): void {
    if (!this.isScanning) {
      return;
    }

    try {
      this.isScanning = false;
    } catch (error) {
      console.error('Error stopping barcode scanner:', error);
    }
  }

  /**
   * Check if scanner is currently running
   */
  isCurrentlyScanning(): boolean {
    return this.isScanning;
  }

  /**
   * Validate barcode format
   */
  validateBarcode(data: string, expectedFormat?: string): boolean {
    if (!data || data.trim().length === 0) {
      return false;
    }

    // Basic validation for common barcode formats
    switch (expectedFormat?.toLowerCase()) {
      case 'ean13':
        return /^\d{13}$/.test(data);
      case 'ean8':
        return /^\d{8}$/.test(data);
      case 'upc':
        return /^\d{12}$/.test(data);
      case 'code128':
        return data.length >= 1 && data.length <= 80;
      case 'qr':
        return data.length >= 1;
      default:
        return true; // Accept any non-empty string for unknown formats
    }
  }

  /**
   * Parse product information from barcode
   */
  parseProductBarcode(data: string): {
    productId?: string;
    sku?: string;
    type: string;
    rawData: string;
  } {
    // This is a simplified parser - in a real app, you'd have more sophisticated parsing
    // based on your barcode format and product database structure
    
    const result = {
      type: 'unknown',
      rawData: data,
      productId: undefined as string | undefined,
      sku: undefined as string | undefined,
    };

    // Check if it's a product SKU format (e.g., "PROD-12345")
    if (/^[A-Z]{2,4}-\d{4,6}$/.test(data)) {
      result.type = 'sku';
      result.sku = data;
      return result;
    }

    // Check if it's a UUID format (product ID)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data)) {
      result.type = 'product_id';
      result.productId = data;
      return result;
    }

    // Check if it's a numeric barcode (EAN/UPC)
    if (/^\d{8,13}$/.test(data)) {
      result.type = 'ean_upc';
      result.sku = data;
      return result;
    }

    return result;
  }

  /**
   * Get supported barcode formats
   */
  getSupportedFormats(): string[] {
    return [
      'QR_CODE',
      'EAN_13',
      'EAN_8',
      'UPC_A',
      'UPC_E',
      'CODE_128',
      'CODE_39',
      'CODE_93',
      'CODABAR',
      'ITF',
      'RSS14',
      'RSS_EXPANDED',
      'PDF_417',
      'AZTEC',
      'DATA_MATRIX',
    ];
  }

  /**
   * Handle scan result and perform validation
   */
  handleScanResult(
    result: BarcodeResult,
    onSuccess: (result: BarcodeResult) => void,
    onError?: (error: Error) => void
  ): void {
    try {
      // Validate the scanned data
      if (!result.data || result.data.trim().length === 0) {
        throw new Error('Invalid barcode data');
      }

      // Parse the barcode
      const parsedResult = this.parseProductBarcode(result.data);
      
      // Add parsed information to the result
      const enhancedResult = {
        ...result,
        parsed: parsedResult,
      };

      onSuccess(enhancedResult as BarcodeResult);
    } catch (error) {
      console.error('Error handling scan result:', error);
      
      if (onError) {
        onError(error as Error);
      } else {
        Alert.alert(
          'Scan Error',
          'Failed to process the scanned barcode. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.isScanning) {
      this.stopScanning();
    }
    this.hasPermission = false;
  }
}

// Export singleton instance
export const barcodeScannerService = new BarcodeScannerService();
export default barcodeScannerService;