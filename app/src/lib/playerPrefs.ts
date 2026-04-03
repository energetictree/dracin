/**
 * Player Preferences Service
 * Manages user preferences for video player (persisted in localStorage)
 */

export interface PlayerPreferences {
  subtitleLanguage: string;  // 'en', 'in', or '' for off
  autoNextEnabled: boolean;  // Auto go to next episode (default: true)
  autoPlayEnabled: boolean;  // Auto play next episode (default: false)
  shouldAutoPlay: boolean;   // Internal flag to trigger autoplay on next load
}

const STORAGE_KEY = 'dracin_player_preferences';

const DEFAULT_PREFS: PlayerPreferences = {
  subtitleLanguage: 'en',  // Default to English
  autoNextEnabled: true,   // Auto Next ON by default
  autoPlayEnabled: false,  // Auto Play OFF by default
  shouldAutoPlay: false,   // Don't autoplay on initial load
};

/**
 * Get player preferences
 */
export function getPlayerPreferences(): PlayerPreferences {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return { ...DEFAULT_PREFS };
    const stored = JSON.parse(data);
    return { ...DEFAULT_PREFS, ...stored };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

/**
 * Save player preferences
 */
export function savePlayerPreferences(prefs: Partial<PlayerPreferences>): void {
  try {
    const current = getPlayerPreferences();
    const newPrefs = { ...current, ...prefs };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
  } catch (error) {
    console.error('Failed to save player preferences:', error);
  }
}

/**
 * Set flag to autoplay on next video load (used by Auto Play feature)
 */
export function setShouldAutoPlay(shouldAutoPlay: boolean): void {
  savePlayerPreferences({ shouldAutoPlay });
}

/**
 * Get and clear the shouldAutoPlay flag (one-time use)
 */
export function consumeShouldAutoPlay(): boolean {
  const prefs = getPlayerPreferences();
  if (prefs.shouldAutoPlay) {
    savePlayerPreferences({ shouldAutoPlay: false });
    return true;
  }
  return false;
}

/**
 * Reset preferences to defaults
 */
export function resetPlayerPreferences(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to reset player preferences:', error);
  }
}
