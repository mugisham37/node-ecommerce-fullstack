#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../src/utils/language-detector';

interface ValidationResult {
  isValid: boolean;
  missingKeys: string[];
  extraKeys: string[];
  errors: string[];
}

interface TranslationFile {
  [key: string]: any;
}

const NAMESPACES = ['common', 'errors', 'validation', 'emails'];
const LOCALES_DIR = path.join(__dirname, '../src/locales');

/**
 * Get all keys from a nested object with dot notation
 */
function getNestedKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...getNestedKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

/**
 * Load translation file
 */
function loadTranslationFile(language: string, namespace: string): TranslationFile | null {
  const filePath = path.join(LOCALES_DIR, language, `${namespace}.json`);
  
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return null;
  }
}

/**
 * Validate translations for a specific namespace
 */
function validateNamespace(namespace: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    missingKeys: [],
    extraKeys: [],
    errors: [],
  };

  // Load the default language file as reference
  const defaultTranslations = loadTranslationFile(DEFAULT_LANGUAGE, namespace);
  
  if (!defaultTranslations) {
    result.isValid = false;
    result.errors.push(`Default language file not found: ${DEFAULT_LANGUAGE}/${namespace}.json`);
    return result;
  }

  const defaultKeys = getNestedKeys(defaultTranslations);
  
  // Validate each supported language
  for (const language of SUPPORTED_LANGUAGES) {
    if (language === DEFAULT_LANGUAGE) continue;
    
    const translations = loadTranslationFile(language, namespace);
    
    if (!translations) {
      result.isValid = false;
      result.errors.push(`Translation file not found: ${language}/${namespace}.json`);
      continue;
    }

    const translationKeys = getNestedKeys(translations);
    
    // Find missing keys
    const missingKeys = defaultKeys.filter(key => !translationKeys.includes(key));
    if (missingKeys.length > 0) {
      result.isValid = false;
      result.missingKeys.push(...missingKeys.map(key => `${language}/${namespace}: ${key}`));
    }
    
    // Find extra keys
    const extraKeys = translationKeys.filter(key => !defaultKeys.includes(key));
    if (extraKeys.length > 0) {
      result.extraKeys.push(...extraKeys.map(key => `${language}/${namespace}: ${key}`));
    }
  }

  return result;
}

/**
 * Validate all translations
 */
function validateAllTranslations(): ValidationResult {
  const overallResult: ValidationResult = {
    isValid: true,
    missingKeys: [],
    extraKeys: [],
    errors: [],
  };

  console.log('🔍 Validating translation files...\n');

  for (const namespace of NAMESPACES) {
    console.log(`Validating namespace: ${namespace}`);
    
    const result = validateNamespace(namespace);
    
    if (!result.isValid) {
      overallResult.isValid = false;
    }
    
    overallResult.missingKeys.push(...result.missingKeys);
    overallResult.extraKeys.push(...result.extraKeys);
    overallResult.errors.push(...result.errors);
    
    if (result.isValid) {
      console.log(`✅ ${namespace}: All translations are valid`);
    } else {
      console.log(`❌ ${namespace}: Found issues`);
    }
  }

  return overallResult;
}

/**
 * Generate missing translation files
 */
function generateMissingFiles(): void {
  console.log('\n🔧 Checking for missing translation files...\n');

  for (const language of SUPPORTED_LANGUAGES) {
    const languageDir = path.join(LOCALES_DIR, language);
    
    if (!fs.existsSync(languageDir)) {
      fs.mkdirSync(languageDir, { recursive: true });
      console.log(`📁 Created directory: ${language}/`);
    }

    for (const namespace of NAMESPACES) {
      const filePath = path.join(languageDir, `${namespace}.json`);
      
      if (!fs.existsSync(filePath)) {
        // Create empty translation file
        fs.writeFileSync(filePath, '{}', 'utf-8');
        console.log(`📄 Created empty file: ${language}/${namespace}.json`);
      }
    }
  }
}

/**
 * Main validation function
 */
function main(): void {
  console.log('🌐 Translation Validation Tool\n');
  console.log(`Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}`);
  console.log(`Default language: ${DEFAULT_LANGUAGE}`);
  console.log(`Namespaces: ${NAMESPACES.join(', ')}\n`);

  // Generate missing files first
  generateMissingFiles();

  // Validate translations
  const result = validateAllTranslations();

  // Print results
  console.log('\n📊 Validation Results:');
  console.log('='.repeat(50));

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(error => console.log(`  - ${error}`));
  }

  if (result.missingKeys.length > 0) {
    console.log('\n⚠️  Missing Keys:');
    result.missingKeys.forEach(key => console.log(`  - ${key}`));
  }

  if (result.extraKeys.length > 0) {
    console.log('\n📝 Extra Keys (not in default language):');
    result.extraKeys.forEach(key => console.log(`  - ${key}`));
  }

  if (result.isValid) {
    console.log('\n✅ All translations are valid!');
    process.exit(0);
  } else {
    console.log('\n❌ Translation validation failed!');
    console.log('\nPlease fix the issues above and run the validation again.');
    process.exit(1);
  }
}

// Run the validation
if (require.main === module) {
  main();
}