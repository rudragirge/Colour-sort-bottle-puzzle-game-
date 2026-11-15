export type Difficulty = 'practice' | 'easy' | 'medium' | 'hard' | 'extreme';

export type GameScreen = 'TITLE' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'LEVEL_SELECT';

export type ColorId = number; // 0 .. 11

export interface Bottle {
  id: number;
  layers: ColorId[]; // bottom-to-top, max capacity = 4
  capacity: number;
}

export interface Move {
  from: number;
  to: number;
  count: number;
  color: ColorId;
}

export interface LevelConfig {
  levelNumber: number; // 0 = Practice, 1+ = Campaign
  difficulty: Difficulty;
  colorCount: number;
  emptyBottles: number;
  capacity: number;
  initialBottles: ColorId[][];
  parMoves: number;
}

export interface ColorPaletteItem {
  id: ColorId;
  name: string;
  hex: string;
  highlight: string;
  shadow: string;
  inkOnColor: string;
  symbol: 'circle' | 'triangle' | 'square' | 'diamond' | 'cross' | 'ring' | 'wave' | 'star' | 'hex' | 'bars' | 'dot' | 'chevron';
}

export interface SavedProgress {
  practiceCompleted: boolean;
  highestUnlockedLevel: number;
  completedLevels: Record<number, { bestMoves: number }>;
  coins: number;
  muted: boolean;
  musicEnabled: boolean;
  showSymbols: boolean;
}
