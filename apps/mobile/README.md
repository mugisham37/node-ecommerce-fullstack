# E-commerce Inventory Mobile App

React Native mobile application for e-commerce inventory management.

## Features

- **Authentication**: Secure login and registration
- **Dashboard**: Overview of inventory and business metrics
- **Inventory Management**: Product listing, details, and stock management
- **Barcode Scanner**: Quick product lookup and stock adjustments
- **Order Management**: Create, view, and manage orders
- **Profile Management**: User settings and preferences

## Tech Stack

- **React Native 0.73.2**
- **TypeScript**
- **React Navigation 6**
- **React Native Paper** (Material Design)
- **tRPC** for type-safe API communication
- **React Query** for data fetching and caching
- **Zustand** for state management
- **React Hook Form** with Zod validation

## Getting Started

### Prerequisites

- Node.js >= 18
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install iOS dependencies (macOS only):
   ```bash
   cd ios && pod install
   ```

3. Start the Metro bundler:
   ```bash
   npm start
   ```

4. Run on Android:
   ```bash
   npm run android
   ```

5. Run on iOS (macOS only):
   ```bash
   npm run ios
   ```

## Development

### Project Structure

```
src/
├── components/          # Reusable UI components
├── screens/            # Screen components
├── navigation/         # Navigation configuration
├── hooks/             # Custom React hooks
├── providers/         # Context providers
├── services/          # API and external services
├── store/             # State management
├── utils/             # Utility functions
├── constants/         # App constants and themes
├── types/             # TypeScript type definitions
└── assets/            # Static assets
```

### Available Scripts

- `npm start` - Start Metro bundler
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```
EXPO_PUBLIC_API_URL=http://localhost:3001
```

### API Integration

The app uses tRPC for type-safe API communication. The API client is configured in `src/lib/trpc.ts`.

## Building for Production

### Android

1. Generate a signed APK:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

2. The APK will be generated at `android/app/build/outputs/apk/release/app-release.apk`

### iOS

1. Open the project in Xcode:
   ```bash
   open ios/EcommerceInventory.xcworkspace
   ```

2. Build and archive for distribution through Xcode

## Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for all new code
3. Write tests for new features
4. Update documentation as needed

## License

MIT License