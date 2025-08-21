import React, {useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {Text, Button, Card} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NavigationProps} from '@/navigation/AppNavigator';
import {theme} from '@/constants/theme';

export const ScannerScreen: React.FC<NavigationProps> = ({navigation}) => {
  const [isScanning, setIsScanning] = useState(false);

  const handleScanStart = () => {
    setIsScanning(true);
    // TODO: Implement actual barcode scanning
    // For now, simulate a scan result
    setTimeout(() => {
      setIsScanning(false);
      navigation.navigate('ScanResult', {
        barcode: '1234567890123',
        productId: '1',
      });
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Barcode Scanner
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Scan product barcodes to quickly access inventory information
          </Text>
        </View>

        <Card style={styles.scannerCard}>
          <Card.Content style={styles.scannerContent}>
            <View style={styles.scannerPlaceholder}>
              <Text variant="bodyLarge" style={styles.placeholderText}>
                {isScanning ? 'Scanning...' : 'Camera view will appear here'}
              </Text>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleScanStart}
            loading={isScanning}
            disabled={isScanning}
            style={styles.scanButton}
            contentStyle={styles.buttonContent}>
            {isScanning ? 'Scanning...' : 'Start Scanning'}
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.navigate('ManualEntry')}
            style={styles.manualButton}
            contentStyle={styles.buttonContent}>
            Manual Entry
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    color: theme.colors.onBackground,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    lineHeight: 24,
  },
  scannerCard: {
    flex: 1,
    marginBottom: 24,
  },
  scannerContent: {
    flex: 1,
    padding: 0,
  },
  scannerPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    minHeight: 300,
  },
  placeholderText: {
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
  },
  scanButton: {
    borderRadius: 8,
  },
  manualButton: {
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});