// Dynamic Expo config.
// Static fields live here; secrets come from EAS environment variables.
// Docs: https://docs.expo.dev/versions/latest/config/app/

export default {
  name:   'Pocket',
  slug:   'pocket-native',          // must be unique on expo.dev
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',        // 1024×1024 PNG — replace with real icon
  userInterfaceStyle: 'automatic',  // respects system dark/light mode

  splash: {
    image: './assets/splash.png',   // 1284×2778 PNG — replace
    resizeMode: 'contain',
    backgroundColor: '#0A0A0F',
  },

  ios: {
    bundleIdentifier: 'com.pocket.app',  // ✏️ change to your reverse-domain ID
    supportsTablet: true,
    infoPlist: {
      // Required for expo-share-intent to explain why we need network access
      NSAppTransportSecurity: { NSAllowsArbitraryLoads: true },
    },
  },

  android: {
    package: 'com.pocket.app',      // ✏️ change to match your Play Console app
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#EF4056',
    },
    intentFilters: [
      // Android share intent — lets users share URLs directly to Pocket
      {
        action: 'android.intent.action.SEND',
        data: [{ mimeType: 'text/plain' }],
        category: ['android.intent.category.DEFAULT'],
      },
    ],
  },

  plugins: [
    'expo-router',
    [
      'expo-share-intent',
      {
        // iOS Share Extension — shows Pocket in the iOS share sheet
        iosActivationRules: {
          NSExtensionActivationSupportsWebURLWithMaxCount:  1,
          NSExtensionActivationSupportsWebPageWithMaxCount: 1,
        },
        androidIntentFilters: ['text/*'],
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
  },

  extra: {
    router: { origin: false },
    eas:    { projectId: 'YOUR_EAS_PROJECT_ID' }, // set after: eas init
  },
};
