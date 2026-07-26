import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@kroos_offline_cache';
const CACHE_EXPIRY = 1000 * 60 * 60;

interface CachedItem<T> {
  data: T;
  timestamp: number;
}

async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_KEY}_${key}`);
    if (!raw) return null;
    const cached: CachedItem<T> = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_EXPIRY) {
      await AsyncStorage.removeItem(`${CACHE_KEY}_${key}`);
      return null;
    }
    return cached.data;
  } catch (e) {
    console.error('Error reading cache:', e);
    return null;
  }
}

async function setCachedData<T>(key: string, data: T): Promise<void> {
  try {
    const cached: CachedItem<T> = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(`${CACHE_KEY}_${key}`, JSON.stringify(cached));
  } catch (e) {
    console.error('Error writing cache:', e);
  }
}

async function clearCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_KEY));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (e) {
    console.error('Error clearing cache:', e);
  }
}

export { getCachedData, setCachedData, clearCache };
