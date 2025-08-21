import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import { request, check, PERMISSIONS, RESULTS, Permission } from 'react-native-permissions';

export enum PermissionType {
  CAMERA = 'camera',
  LOCATION = 'location',
  STORAGE = 'storage',
  MICROPHONE = 'microphone',
  NOTIFICATIONS = 'notifications',
}

export interface PermissionStatus {
  granted: boolean;
  denied: boolean;
  blocked: boolean;
  unavailable: boolean;
}

export class PermissionManager {
  private static instance: PermissionManager;

  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  private getPermissionForPlatform(type: PermissionType): Permission | string {
    const permissions = {
      [PermissionType.CAMERA]: Platform.select({
        ios: PERMISSIONS.IOS.CAMERA,
        android: PermissionsAndroid.PERMISSIONS.CAMERA,
      }),
      [PermissionType.LOCATION]: Platform.select({
        ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
        android: PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      }),
      [PermissionType.STORAGE]: Platform.select({
        ios: PERMISSIONS.IOS.PHOTO_LIBRARY,
        android: PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      }),
      [PermissionType.MICROPHONE]: Platform.select({
        ios: PERMISSIONS.IOS.MICROPHONE,
        android: PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      }),
      [PermissionType.NOTIFICATIONS]: Platform.select({
        ios: PERMISSIONS.IOS.NOTIFICATIONS,
        android: 'android.permission.POST_NOTIFICATIONS',
      }),
    };

    return permissions[type] as Permission | string;
  }

  async checkPermission(type: PermissionType): Promise<PermissionStatus> {
    const permission = this.getPermissionForPlatform(type);
    
    if (Platform.OS === 'android' && typeof permission === 'string') {
      const result = await PermissionsAndroid.check(permission);
      return {
        granted: result,
        denied: !result,
        blocked: false,
        unavailable: false,
      };
    }

    if (typeof permission === 'object') {
      const result = await check(permission);
      return {
        granted: result === RESULTS.GRANTED,
        denied: result === RESULTS.DENIED,
        blocked: result === RESULTS.BLOCKED,
        unavailable: result === RESULTS.UNAVAILABLE,
      };
    }

    return {
      granted: false,
      denied: true,
      blocked: false,
      unavailable: true,
    };
  }

  async requestPermission(type: PermissionType): Promise<PermissionStatus> {
    const permission = this.getPermissionForPlatform(type);
    
    if (Platform.OS === 'android' && typeof permission === 'string') {
      try {
        const result = await PermissionsAndroid.request(permission, {
          title: this.getPermissionTitle(type),
          message: this.getPermissionMessage(type),
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        });
        
        return {
          granted: result === PermissionsAndroid.RESULTS.GRANTED,
          denied: result === PermissionsAndroid.RESULTS.DENIED,
          blocked: result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
          unavailable: false,
        };
      } catch (err) {
        console.warn('Permission request error:', err);
        return {
          granted: false,
          denied: true,
          blocked: false,
          unavailable: false,
        };
      }
    }

    if (typeof permission === 'object') {
      const result = await request(permission);
      return {
        granted: result === RESULTS.GRANTED,
        denied: result === RESULTS.DENIED,
        blocked: result === RESULTS.BLOCKED,
        unavailable: result === RESULTS.UNAVAILABLE,
      };
    }

    return {
      granted: false,
      denied: true,
      blocked: false,
      unavailable: true,
    };
  }

  async requestMultiplePermissions(types: PermissionType[]): Promise<Record<PermissionType, PermissionStatus>> {
    const results: Record<PermissionType, PermissionStatus> = {} as any;
    
    for (const type of types) {
      results[type] = await this.requestPermission(type);
    }
    
    return results;
  }

  async ensurePermission(type: PermissionType): Promise<boolean> {
    const status = await this.checkPermission(type);
    
    if (status.granted) {
      return true;
    }
    
    if (status.blocked) {
      this.showPermissionBlockedAlert(type);
      return false;
    }
    
    const requestResult = await this.requestPermission(type);
    
    if (requestResult.blocked) {
      this.showPermissionBlockedAlert(type);
      return false;
    }
    
    return requestResult.granted;
  }

  private getPermissionTitle(type: PermissionType): string {
    const titles = {
      [PermissionType.CAMERA]: 'Camera Permission',
      [PermissionType.LOCATION]: 'Location Permission',
      [PermissionType.STORAGE]: 'Storage Permission',
      [PermissionType.MICROPHONE]: 'Microphone Permission',
      [PermissionType.NOTIFICATIONS]: 'Notification Permission',
    };
    return titles[type];
  }

  private getPermissionMessage(type: PermissionType): string {
    const messages = {
      [PermissionType.CAMERA]: 'This app needs camera access to scan barcodes and take product photos.',
      [PermissionType.LOCATION]: 'This app needs location access for warehouse and inventory tracking.',
      [PermissionType.STORAGE]: 'This app needs storage access to save and manage product images.',
      [PermissionType.MICROPHONE]: 'This app needs microphone access for voice notes and commands.',
      [PermissionType.NOTIFICATIONS]: 'This app needs notification access to send inventory alerts.',
    };
    return messages[type];
  }

  private showPermissionBlockedAlert(type: PermissionType): void {
    Alert.alert(
      'Permission Required',
      `${this.getPermissionMessage(type)} Please enable it in your device settings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  }

  async checkAllRequiredPermissions(): Promise<Record<PermissionType, PermissionStatus>> {
    const requiredPermissions = [
      PermissionType.CAMERA,
      PermissionType.LOCATION,
      PermissionType.STORAGE,
    ];
    
    const results: Record<PermissionType, PermissionStatus> = {} as any;
    
    for (const type of requiredPermissions) {
      results[type] = await this.checkPermission(type);
    }
    
    return results;
  }

  async requestAllRequiredPermissions(): Promise<boolean> {
    const requiredPermissions = [
      PermissionType.CAMERA,
      PermissionType.LOCATION,
      PermissionType.STORAGE,
    ];
    
    const results = await this.requestMultiplePermissions(requiredPermissions);
    
    return Object.values(results).every(status => status.granted);
  }
}

export default PermissionManager.getInstance();