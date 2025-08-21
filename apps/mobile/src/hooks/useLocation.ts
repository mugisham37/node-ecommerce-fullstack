import { useState, useEffect, useCallback, useRef } from 'react';
import LocationService, { LocationCoordinates, LocationOptions } from '../services/LocationService';

export interface UseLocationReturn {
  location: LocationCoordinates | null;
  isLoading: boolean;
  error: string | null;
  accuracy: number | null;
  getCurrentLocation: (options?: LocationOptions) => Promise<LocationCoordinates | null>;
  startWatching: (options?: LocationOptions) => void;
  stopWatching: () => void;
  isWatching: boolean;
  calculateDistance: (targetLocation: LocationCoordinates) => number | null;
  isNearLocation: (targetLocation: LocationCoordinates, radiusKm?: number) => boolean;
}

export const useLocation = (): UseLocationReturn => {
  const [location, setLocation] = useState<LocationCoordinates | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const locationService = useRef(LocationService);

  const getCurrentLocation = useCallback(async (options?: LocationOptions): Promise<LocationCoordinates | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const currentLocation = await locationService.current.getCurrentLocation(options);
      setLocation(currentLocation);
      return currentLocation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startWatching = useCallback((options?: LocationOptions) => {
    if (isWatching) return;

    setIsWatching(true);
    setError(null);

    locationService.current.watchLocation(
      (newLocation) => {
        setLocation(newLocation);
        setError(null);
      },
      (watchError) => {
        setError(watchError.message);
      },
      options
    );
  }, [isWatching]);

  const stopWatching = useCallback(() => {
    if (!isWatching) return;

    locationService.current.stopWatchingLocation();
    setIsWatching(false);
  }, [isWatching]);

  const calculateDistance = useCallback((targetLocation: LocationCoordinates): number | null => {
    if (!location) return null;

    return locationService.current.calculateDistance(
      location.latitude,
      location.longitude,
      targetLocation.latitude,
      targetLocation.longitude
    );
  }, [location]);

  const isNearLocation = useCallback((targetLocation: LocationCoordinates, radiusKm: number = 0.1): boolean => {
    if (!location) return false;

    const distance = calculateDistance(targetLocation);
    return distance !== null && distance <= radiusKm;
  }, [location, calculateDistance]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isWatching) {
        locationService.current.stopWatchingLocation();
      }
    };
  }, [isWatching]);

  return {
    location,
    isLoading,
    error,
    accuracy: location?.accuracy || null,
    getCurrentLocation,
    startWatching,
    stopWatching,
    isWatching,
    calculateDistance,
    isNearLocation,
  };
};

// Hook for warehouse location tracking
export const useWarehouseLocation = (warehouseLocation: LocationCoordinates) => {
  const location = useLocation();
  const [isAtWarehouse, setIsAtWarehouse] = useState(false);
  const [distanceToWarehouse, setDistanceToWarehouse] = useState<number | null>(null);

  useEffect(() => {
    if (location.location) {
      const distance = location.calculateDistance(warehouseLocation);
      setDistanceToWarehouse(distance);
      setIsAtWarehouse(location.isNearLocation(warehouseLocation, 0.1)); // 100m radius
    }
  }, [location.location, warehouseLocation, location]);

  return {
    ...location,
    isAtWarehouse,
    distanceToWarehouse,
    warehouseLocation,
  };
};

// Hook for geofencing functionality
export const useGeofencing = () => {
  const location = useLocation();
  const [geofences, setGeofences] = useState<Array<{
    id: string;
    location: LocationCoordinates;
    radius: number;
    name: string;
  }>>([]);
  const [activeGeofences, setActiveGeofences] = useState<string[]>([]);

  const addGeofence = useCallback((
    id: string,
    geoLocation: LocationCoordinates,
    radius: number,
    name: string
  ) => {
    setGeofences(prev => [
      ...prev.filter(g => g.id !== id),
      { id, location: geoLocation, radius, name }
    ]);
  }, []);

  const removeGeofence = useCallback((id: string) => {
    setGeofences(prev => prev.filter(g => g.id !== id));
    setActiveGeofences(prev => prev.filter(gId => gId !== id));
  }, []);

  useEffect(() => {
    if (!location.location) return;

    const currentlyActive: string[] = [];

    geofences.forEach(geofence => {
      const distance = location.calculateDistance(geofence.location);
      if (distance !== null && distance <= geofence.radius) {
        currentlyActive.push(geofence.id);
      }
    });

    setActiveGeofences(currentlyActive);
  }, [location.location, geofences, location]);

  return {
    ...location,
    geofences,
    activeGeofences,
    addGeofence,
    removeGeofence,
  };
};

// Hook for location-based inventory tracking
export const useInventoryLocation = () => {
  const location = useLocation();
  const [inventoryLocations, setInventoryLocations] = useState<Array<{
    id: string;
    name: string;
    location: LocationCoordinates;
    type: 'warehouse' | 'store' | 'supplier';
  }>>([]);

  const addInventoryLocation = useCallback((
    id: string,
    name: string,
    locationCoords: LocationCoordinates,
    type: 'warehouse' | 'store' | 'supplier'
  ) => {
    setInventoryLocations(prev => [
      ...prev.filter(l => l.id !== id),
      { id, name, location: locationCoords, type }
    ]);
  }, []);

  const getNearbyLocations = useCallback((radiusKm: number = 1): Array<{
    id: string;
    name: string;
    location: LocationCoordinates;
    type: 'warehouse' | 'store' | 'supplier';
    distance: number;
  }> => {
    if (!location.location) return [];

    return inventoryLocations
      .map(invLocation => ({
        ...invLocation,
        distance: location.calculateDistance(invLocation.location) || Infinity,
      }))
      .filter(invLocation => invLocation.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  }, [location.location, inventoryLocations, location]);

  const getCurrentLocationContext = useCallback(() => {
    const nearby = getNearbyLocations(0.1); // 100m radius
    return nearby.length > 0 ? nearby[0] : null;
  }, [getNearbyLocations]);

  return {
    ...location,
    inventoryLocations,
    addInventoryLocation,
    getNearbyLocations,
    getCurrentLocationContext,
  };
};