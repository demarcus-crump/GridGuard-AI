
// ============================================================================
// SYSTEM CONFIGURATION & CREDENTIALS
// ============================================================================

export const API_CONFIG = {
  // GRIDSTATUS.IO (Required for Load, Mix, LMP, Queue)
  GRID_STATUS_KEY: "",

  // GOOGLE GEMINI (Required for Intelligence, Chat, Vision, Live)
  GOOGLE_API_KEY: "",

  // EIA (Required for Historical Data)
  EIA_KEY: "",

  // NEWS API (For Market/Grid News)
  NEWS_API_KEY: "",

  // NASA (For Satellite Imagery/Fire Data)
  NASA_API_KEY: "",

  // WEATHER API - VisualCrossing
  WEATHER_API_KEY: "",

  // ERCOT (Optional Direct Access)
  ERCOT_API_KEY: "",

  // CESIUM ION (3D Globe) - Set in .env.local as VITE_CESIUM_ION_TOKEN
  CESIUM_ION_TOKEN: ""
};

export const getActiveKey = (keyName: keyof typeof API_CONFIG): string => {
  // 1. Check Vite Environment Variables (Highest Priority)
  const envKey = `VITE_${keyName}`;
  const viteEnv = (import.meta as any).env?.[envKey];
  if (viteEnv) return viteEnv;

  // 2. Check hardcoded config (Legacy/Compatibility)
  if (API_CONFIG[keyName] && API_CONFIG[keyName] !== "") {
    return API_CONFIG[keyName];
  }

  // 3. Check localStorage (Browser overrides)
  const local = localStorage.getItem(keyName);
  if (local) return local;

  // 4. Check Node environment (SSR/Testing)
  try {
    if (typeof process !== 'undefined' && process.env && process.env[envKey]) {
      return process.env[envKey] as string;
    }
  } catch (e) { }

  return "";
};
