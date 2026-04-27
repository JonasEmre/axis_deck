const USER_SETTINGS_STORAGE_KEY = "axisDeckUserSettings";

export function getStoredUserSettings() {
  try {
    const rawSettings = window.localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    return rawSettings ? JSON.parse(rawSettings) : null;
  } catch {
    return null;
  }
}

export function saveStoredUserSettings(settings) {
  try {
    window.localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Browsers can reject storage in private mode or when site data is full.
  }
}

export function getActiveAppModule() {
  const settings = getStoredUserSettings();
  return typeof settings?.activeAppModule === "string" ? settings.activeAppModule : null;
}

export function saveActiveAppModule(moduleId) {
  const settings = getStoredUserSettings();
  saveStoredUserSettings({
    ...(settings && typeof settings === "object" ? settings : {}),
    activeAppModule: moduleId,
  });
}

export function clearActiveAppModule() {
  const settings = getStoredUserSettings();
  if (!settings || typeof settings !== "object") {
    return;
  }

  const nextSettings = { ...settings };
  delete nextSettings.activeAppModule;
  saveStoredUserSettings(nextSettings);
}
