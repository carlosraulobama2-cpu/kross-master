import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = (process.env as any).EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = (process.env as any).EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
