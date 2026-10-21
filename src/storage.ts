import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'pebble.token';
const URL_KEY = 'pebble.apiUrl';

async function readSecret(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(key);
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return AsyncStorage.getItem(key);
  }
}

async function writeSecret(key: string, value: string | null) {
  if (Platform.OS === 'web') {
    if (value == null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, value);
    return;
  }
  try {
    if (value == null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    if (value == null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, value);
  }
}

export const storage = {
  getToken: () => readSecret(TOKEN_KEY),
  setToken: (value: string | null) => writeSecret(TOKEN_KEY, value),
  getApiUrl: () => AsyncStorage.getItem(URL_KEY),
  setApiUrl: (value: string | null) =>
    value == null ? AsyncStorage.removeItem(URL_KEY) : AsyncStorage.setItem(URL_KEY, value),
};
