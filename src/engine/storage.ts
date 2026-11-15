import type { SavedProgress } from './types';

const STORAGE_KEY = 'decant_color_sort_progress_v1';

const DEFAULT_PROGRESS: SavedProgress = {
  practiceCompleted: false,
  highestUnlockedLevel: 1,
  completedLevels: {},
  coins: 0,
  muted: false,
  musicEnabled: true,
  showSymbols: false,
};

export function loadProgress(): SavedProgress {
  if (typeof window === 'undefined') return { ...DEFAULT_PROGRESS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    return {
      practiceCompleted: Boolean(parsed.practiceCompleted),
      highestUnlockedLevel:
        typeof parsed.highestUnlockedLevel === 'number' && parsed.highestUnlockedLevel >= 1
          ? Math.min(5000, Math.floor(parsed.highestUnlockedLevel))
          : 1,
      completedLevels:
        parsed.completedLevels && typeof parsed.completedLevels === 'object'
          ? parsed.completedLevels
          : {},
      coins:
        typeof parsed.coins === 'number' && Number.isFinite(parsed.coins) && parsed.coins >= 0
          ? Math.floor(parsed.coins)
          : 0,
      muted: Boolean(parsed.muted),
      musicEnabled: parsed.musicEnabled !== undefined ? Boolean(parsed.musicEnabled) : true,
      showSymbols: Boolean(parsed.showSymbols),
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(progress: SavedProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors in restricted environments
  }
}
