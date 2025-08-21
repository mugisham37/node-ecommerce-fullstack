import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  Dimensions,
  Modal,
} from 'react-native';

interface LoadingSpinnerProps {
  visible?: boolean;
  text?: string;
  size?: 'small' | 'large';
  color?: string;
  overlay?: boolean;
  transparent?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  visible = true,
  text,
  size = 'large',
  color = '#007AFF',
  overlay = false,
  transparent = false,
}) => {
  if (!visible) return null;

  const content = (
    <View style={[styles.container, overlay && styles.overlay]}>
      <View style={[styles.spinnerContainer, transparent && styles.transparent]}>
        <ActivityIndicator size={size} color={color} />
        {text && <Text style={[styles.text, { color }]}>{text}</Text>}
      </View>
    </View>
  );

  if (overlay) {
    return (
      <Modal transparent visible={visible} animationType="fade">
        {content}
      </Modal>
    );
  }

  return content;
};

// Optimized inline loading component for lists
export const InlineLoader: React.FC<{
  size?: 'small' | 'large';
  color?: string;
  style?: any;
}> = ({ size = 'small', color = '#007AFF', style }) => (
  <View style={[styles.inlineContainer, style]}>
    <ActivityIndicator size={size} color={color} />
  </View>
);

// Skeleton loading component for better UX
export const SkeletonLoader: React.FC<{
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}> = ({ width = '100%', height = 20, borderRadius = 4, style }) => (
  <View
    style={[
      styles.skeleton,
      {
        width,
        height,
        borderRadius,
      },
      style,
    ]}
  />
);

// Card skeleton for product/inventory items
export const CardSkeleton: React.FC = () => (
  <View style={styles.cardSkeleton}>
    <SkeletonLoader width={60} height={60} borderRadius={8} />
    <View style={styles.cardSkeletonContent}>
      <SkeletonLoader width="80%" height={16} />
      <SkeletonLoader width="60%" height={14} style={{ marginTop: 8 }} />
      <SkeletonLoader width="40%" height={12} style={{ marginTop: 4 }} />
    </View>
  </View>
);

// List skeleton for multiple items
export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <View>
    {Array.from({ length: count }).map((_, index) => (
      <CardSkeleton key={index} />
    ))}
  </View>
);

// Pull to refresh loading indicator
export const PullToRefreshLoader: React.FC<{
  refreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
}> = ({ refreshing, onRefresh, children }) => {
  return (
    <View style={styles.pullToRefreshContainer}>
      {refreshing && (
        <View style={styles.pullToRefreshIndicator}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      )}
      {children}
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  spinnerContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  transparent: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  inlineContainer: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeleton: {
    backgroundColor: '#E1E9EE',
    opacity: 0.7,
  },
  cardSkeleton: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    marginVertical: 4,
    marginHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  cardSkeletonContent: {
    flex: 1,
    marginLeft: 12,
  },
  pullToRefreshContainer: {
    flex: 1,
  },
  pullToRefreshIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 100,
  },
});

export default LoadingSpinner;