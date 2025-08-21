import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}

export interface LocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export class LocationService {
  private static instance: LocationService;
  private watchId: number | null = null;

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to location for inventory tracking',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Location permission error:', err);
        return false;
      }
    }
    return true; // iOS handles permissions differently
  }

  async getCurrentLocation(options?: LocationOptions): Promise<LocationCoordinates> {
    const hasPermission = await this.requestLocationPermission();
    if (!hasPermission) {
      throw new Error('Location permission denied');
    }

    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
          });
        },
        (error) => reject(new Error(`Location error: ${error.message}`)),
        {
          enableHighAccuracy: options?.enableHighAccuracy ?? true,
          timeout: options?.timeout ?? 15000,
          maximumAge: options?.maximumAge ?? 10000,
        }
      );
    });
  }

  async watchLocation(
    callback: (location: LocationCoordinates) => void,
    errorCallback?: (error: Error) => void,
    options?: LocationOptions
  ): Promise<void> {
    const hasPermission = await this.requestLocationPermission();
    if (!hasPermission) {
      throw new Error('Location permission denied');
    }

    this.watchId = Geolocation.watchPosition(
      (position) => {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude || undefined,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
        });
      },
      (error) => {
        if (errorCallback) {
          errorCallback(new Error(`Location watch error: ${error.message}`));
        }
      },
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 15000,
        maximumAge: options?.maximumAge ?? 10000,
        distanceFilter: 10, // Update every 10 meters
      }
    );
  }

  stopWatchingLocation(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  async isLocationNearWarehouse(
    currentLocation: LocationCoordinates,
    warehouseLocation: LocationCoordinates,
    radiusKm: number = 0.1
  ): Promise<boolean> {
    const distance = this.calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      warehouseLocation.latitude,
      warehouseLocation.longitude
    );
    return distance <= radiusKm;
  }
}

export default LocationService.getInstance();