import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { useColorScheme, View, StyleSheet } from 'react-native';
import { AuthProvider } from '../contexts/AuthContext';
import AnimatedSplash from './AnimatedSplash';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
  );
}

function RootLayoutContent() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [splashAnimationDone, setSplashAnimationDone] = useState(false);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      // Native splash screen hands off immediately to AnimatedSplash (same #0F172A background)
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <View style={styles.rootContainer}>
      {/* Real navigator mounts underneath immediately */}
      <RootLayoutNav />

      {/* Custom animated splash overlays on top and unmounts once completed */}
      {!splashAnimationDone && (
        <AnimatedSplash onFinish={() => setSplashAnimationDone(true)} />
      )}
    </View>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="unauthenticated/watch" options={{ title: 'Spectator Portal', headerShown: false }} />
        <Stack.Screen name="unauthenticated/[eventSlug]" options={{ title: 'Live Dashboard', headerShown: false }} />
        <Stack.Screen name="(scorekeeper)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
});

