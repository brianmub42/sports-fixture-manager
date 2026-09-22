import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useDeviceColorScheme, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Colors } from '../constants/Colors';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  colors: typeof Colors.dark;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const STORAGE_KEY = 'user_color_scheme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useDeviceColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>('dark'); // default to sleek dark mode
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function loadTheme() {
      try {
        let saved: string | null = null;
        if (Platform.OS === 'web') {
          saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        } else {
          saved = await SecureStore.getItemAsync(STORAGE_KEY);
        }

        if (saved === 'light' || saved === 'dark') {
          setThemeState(saved);
        } else if (systemScheme === 'light' || systemScheme === 'dark') {
          setThemeState(systemScheme);
        }
      } catch (err) {
        console.warn('Failed to load user theme preference:', err);
      } finally {
        setIsReady(true);
      }
    }
    loadTheme();
  }, [systemScheme]);

  const setTheme = async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, newTheme);
        }
      } else {
        await SecureStore.setItemAsync(STORAGE_KEY, newTheme);
      }
    } catch (err) {
      console.warn('Failed to save user theme preference:', err);
    }
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  const isDark = theme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
