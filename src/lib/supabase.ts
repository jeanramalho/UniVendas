import { createClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || 'https://dtszbdcljnfxffualwah.supabase.co';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// Initialize client if credentials are non-placeholder
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseAnonKey !== 'your-supabase-anon-key' &&
  supabaseAnonKey !== 'your-supabase-publishable-key' &&
  !supabaseAnonKey.includes('your-')
);

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || 'placeholder-key-for-initialization'
);

// Local Storage Keys for offline / fallback mode
export const STORAGE_KEYS = {
  MEMBERS: 'univendas_members',
  PRODUCTS: 'univendas_products',
  CATEGORIES: 'univendas_categories',
  KITS: 'univendas_kits',
  SALES: 'univendas_sales',
  BATCHES: 'univendas_batches',
  DELIVERIES: 'univendas_deliveries',
  RETURNS: 'univendas_returns',
  SETTINGS: 'univendas_settings',
  USERS: 'univendas_users',
  AUDIT_LOGS: 'univendas_audit_logs',
  DUPLICATES: 'univendas_duplicates',
  CURRENT_USER: 'univendas_current_user'
};

export function loadLocalData<T>(key: string, defaultData: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultData));
      return defaultData;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Error loading local storage key "${key}":`, err);
    return defaultData;
  }
}

export function saveLocalData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving local storage key "${key}":`, err);
  }
}
