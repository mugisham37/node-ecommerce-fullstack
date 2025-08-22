import React, { useState } from 'react';
import { useLanguage, mobileI18nUtils, type SupportedLanguage } from '../lib/i18n';

// Mock React Native components for now
const View = ({ children, style }: any) => <div style={style}>{children}</div>;
const Text = ({ children, style }: any) => <span style={style}>{children}</span>;
const TouchableOpacity = ({ children, onPress, style, disabled }: any) => (
  <button onClick={onPress} style={style} disabled={disabled}>{children}</button>
);
const Modal = ({ children, visible }: any) => visible ? <div>{children}</div> : null;
const FlatList = ({ data, renderItem, keyExtractor }: any) => (
  <div>
    {data.map((item: any) => (
      <div key={keyExtractor(item)}>{renderItem({ item })}</div>
    ))}
  </div>
);
const Alert = {
  alert: (title: string, message: string, buttons: any[]) => {
    alert(`${title}: ${message}`);
  }
};
const StyleSheet = {
  create: (styles: any) => styles
};

/**
 * Language switcher component for mobile application
 * Provides a modal picker to switch between supported languages
 */

interface LanguageSwitcherProps {
  variant?: 'button' | 'compact' | 'list';
  showFlag?: boolean;
  showLabel?: boolean;
  style?: any;
  textStyle?: any;
}

export function LanguageSwitcher({
  variant = 'button',
  showFlag = true,
  showLabel = true,
  style,
  textStyle,
}: LanguageSwitcherProps) {
  const { language, supportedLanguages, isLoading, setLanguage } = useLanguage();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleLanguageChange = async (newLanguage: SupportedLanguage) => {
    try {
      await setLanguage(newLanguage);
      setIsModalVisible(false);
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to change language. Please try again.',
        [{ text: 'OK' }]
      );
      console.error('Failed to change language:', error);
    }
  };

  const currentLanguageOption = mobileI18nUtils.formatLanguageOption(language);
  const languageOptions = mobileI18nUtils.getAllLanguageOptions();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, style]}>
        <Text style={[styles.loadingText, textStyle]}>Loading...</Text>
      </View>
    );
  }

  const renderLanguageItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.languageItem,
        language === item.value && styles.selectedLanguageItem,
      ]}
      onPress={() => handleLanguageChange(item.value)}
    >
      <View style={styles.languageItemContent}>
        {showFlag && <Text style={styles.flag}>{item.flag}</Text>}
        {showLabel && (
          <Text
            style={[
              styles.languageLabel,
              language === item.value && styles.selectedLanguageLabel,
            ]}
          >
            {item.label}
          </Text>
        )}
      </View>
      {language === item.value && (
        <Text style={styles.checkmark}>✓</Text>
      )}
    </TouchableOpacity>
  );

  if (variant === 'compact') {
    return (
      <>
        <TouchableOpacity
          style={[styles.compactButton, style]}
          onPress={() => setIsModalVisible(true)}
        >
          {showFlag && <Text style={styles.compactFlag}>{currentLanguageOption.flag}</Text>}
          {showLabel && (
            <Text style={[styles.compactLabel, textStyle]}>
              {currentLanguageOption.label}
            </Text>
          )}
        </TouchableOpacity>

        <Modal
          visible={isModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Language</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setIsModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={languageOptions}
                renderItem={renderLanguageItem}
                keyExtractor={(item) => item.value}
                style={styles.languageList}
              />
            </View>
          </View>
        </Modal>
      </>
    );
  }

  if (variant === 'list') {
    return (
      <View style={[styles.listContainer, style]}>
        <Text style={[styles.listTitle, textStyle]}>Language</Text>
        <FlatList
          data={languageOptions}
          renderItem={renderLanguageItem}
          keyExtractor={(item) => item.value}
          scrollEnabled={false}
        />
      </View>
    );
  }

  // Default button variant
  return (
    <>
      <TouchableOpacity
        style={[styles.button, style]}
        onPress={() => setIsModalVisible(true)}
      >
        <View style={styles.buttonContent}>
          {showFlag && <Text style={styles.flag}>{currentLanguageOption.flag}</Text>}
          {showLabel && (
            <Text style={[styles.buttonLabel, textStyle]}>
              {currentLanguageOption.label}
            </Text>
          )}
          <Text style={styles.chevron}>▼</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={languageOptions}
              renderItem={renderLanguageItem}
              keyExtractor={(item) => item.value}
              style={styles.languageList}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

/**
 * Simple language picker for forms
 */
interface LanguagePickerProps {
  value: SupportedLanguage;
  onChange: (language: SupportedLanguage) => void;
  style?: any;
  disabled?: boolean;
}

export function LanguagePicker({
  value,
  onChange,
  style,
  disabled = false,
}: LanguagePickerProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const languageOptions = mobileI18nUtils.getAllLanguageOptions();
  const selectedOption = mobileI18nUtils.formatLanguageOption(value);

  const handleSelect = (language: SupportedLanguage) => {
    onChange(language);
    setIsModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.pickerButton, disabled && styles.disabledButton, style]}
        onPress={() => !disabled && setIsModalVisible(true)}
        disabled={disabled}
      >
        <View style={styles.pickerContent}>
          <Text style={styles.flag}>{selectedOption.flag}</Text>
          <Text style={[styles.pickerLabel, disabled && styles.disabledText]}>
            {selectedOption.label}
          </Text>
          <Text style={[styles.chevron, disabled && styles.disabledText]}>▼</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={languageOptions}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageItem,
                    value === item.value && styles.selectedLanguageItem,
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  <View style={styles.languageItemContent}>
                    <Text style={styles.flag}>{item.flag}</Text>
                    <Text
                      style={[
                        styles.languageLabel,
                        value === item.value && styles.selectedLanguageLabel,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                  {value === item.value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.value}
              style={styles.languageList}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 12,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  button: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginLeft: 8,
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  compactFlag: {
    fontSize: 16,
    marginRight: 4,
  },
  compactLabel: {
    fontSize: 14,
    color: '#333',
  },
  flag: {
    fontSize: 20,
    marginRight: 8,
  },
  chevron: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  languageList: {
    paddingHorizontal: 20,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedLanguageItem: {
    backgroundColor: '#f0f8ff',
  },
  languageItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  languageLabel: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  selectedLanguageLabel: {
    color: '#007AFF',
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  listContainer: {
    backgroundColor: '#fff',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
  },
  pickerButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  disabledText: {
    color: '#999',
  },
});

export default LanguageSwitcher;