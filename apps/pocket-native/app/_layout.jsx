// Root layout — first file Expo Router loads.
//
// Import order is critical:
//   1. Firebase RN setup (must run before anything touches firebase/auth)
//   2. @pocket/core providers
//   3. Everything else

import '../src/firebase/setup';             // ← must be first

import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ShareIntentProvider } from 'expo-share-intent';
import { AuthProvider, useAuth } from '@pocket/core/context';

// Redirect unauthenticated users to /login, authenticated users away from it.
function AuthGuard() {
  const { user, loading } = useAuth();
  const router   = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) router.replace('/(auth)/login');
    if (user  &&  inAuth) router.replace('/(tabs)');
  }, [user, loading, segments, router]);

  return null;
}

export default function RootLayout() {
  return (
    // ShareIntentProvider wraps the whole app so any screen can detect
    // when the user shared a URL to Pocket from another app.
    <ShareIntentProvider>
      <AuthProvider>
        <AuthGuard />
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)"  options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)"  options={{ headerShown: false }} />
          <Stack.Screen
            name="read/[id]"
            options={{
              headerShown: true,
              title: '',
              headerBackTitle: 'Back',
              headerStyle:      { backgroundColor: '#0A0A0F' },
              headerTintColor:  '#EF4056',
            }}
          />
        </Stack>
      </AuthProvider>
    </ShareIntentProvider>
  );
}
