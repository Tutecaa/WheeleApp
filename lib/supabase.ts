import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const serverStorage = new Map<string, string>();
const storage = Platform.OS !== "web"
  ? AsyncStorage
  : typeof window === "undefined"
    ? {
        getItem: async (key: string) => serverStorage.get(key) ?? null,
        setItem: async (key: string, value: string) => {
          serverStorage.set(key, value);
        },
        removeItem: async (key: string) => {
          serverStorage.delete(key);
        },
      }
    : {
        getItem: async (key: string) => window.localStorage.getItem(key),
        setItem: async (key: string, value: string) => {
          window.localStorage.setItem(key, value);
        },
        removeItem: async (key: string) => {
          window.localStorage.removeItem(key);
        },
      };

export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder-anon-key",
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  },
);
